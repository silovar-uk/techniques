const app = document.querySelector('#app');
const techniqueCount = document.querySelector('#techniqueCount');
const siteStatus = document.querySelector('#siteStatus');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let techniques = [];
let activeCategory = 'すべて';
let searchQuery = '';
let lastRenderedHash = location.hash;
let lastSelectedId = readSession('techniques:last-selected') || '';
let homeScrollPosition = Number(readSession('techniques:home-scroll')) || 0;
let pendingRandomId = '';
let pendingSearchFocus = false;
let routeScheduled = false;
let searchAnnouncementTimer = 0;
let copyResetTimer = 0;
const searchIndex = new Map();
const techniqueNumbers = new Map();

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const normalize = (value = '') => String(value).toLowerCase().normalize('NFKC');

function readSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // Storage may be unavailable in private or restricted browsing contexts.
  }
}

function announce(message) {
  if (!siteStatus) return;
  siteStatus.textContent = '';
  requestAnimationFrame(() => { siteStatus.textContent = message; });
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'short', day: 'numeric'
  }).format(date);
}

function formatSinceDate() {
  const values = techniques.map(item => item.updated).filter(Boolean).sort();
  if (!values.length) return '';
  const date = new Date(`${values[0]}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', year: 'numeric'
  }).format(date);
}

function buildTechniqueNumbers() {
  const creationOrder = [...techniques]
    .sort((a, b) => String(a.updated).localeCompare(String(b.updated)) || String(a.id).localeCompare(String(b.id)));
  creationOrder.forEach((item, index) => {
    techniqueNumbers.set(item.id, item.number || `T-${String(index + 1).padStart(3, '0')}`);
  });
}

function getTechniqueNumber(item) {
  return techniqueNumbers.get(item.id) || item.number || 'T-000';
}

function getEvidence(item) {
  const level = String(item.evidence?.level || '').toUpperCase();
  const presets = {
    VERIFIED: { label: 'VERIFIED', ja: '一次資料・公式仕様', className: 'verified' },
    SUPPORTED: { label: 'SUPPORTED', ja: '関連根拠あり', className: 'supported' },
    PERSONAL: { label: 'PERSONAL', ja: '経験則・試すメモ', className: 'personal' }
  };
  return presets[level] || null;
}

function searchableText(item) {
  if (searchIndex.has(item.id)) return searchIndex.get(item.id);
  const commandText = (item.commands || []).flatMap(command => [command.label, command.code, command.note]);
  const explanationText = (item.explanation || []).flatMap(row => [row.term, row.text]);
  const sourceText = (item.sources || []).flatMap(source => [source.label, source.url]);
  const value = normalize([
    getTechniqueNumber(item), item.title, item.summary, item.category,
    ...(item.tags || []), item.quickAnswer, ...(item.steps || []),
    ...commandText, ...explanationText, ...(item.tips || []), ...sourceText
  ].filter(Boolean).join(' '));
  searchIndex.set(item.id, value);
  return value;
}

function getFilteredItems() {
  const query = normalize(searchQuery.trim());
  return techniques.filter(item => {
    const categoryMatch = activeCategory === 'すべて' || item.category === activeCategory;
    const queryMatch = !query || searchableText(item).includes(query);
    return categoryMatch && queryMatch;
  });
}

function renderEvidenceBadge(item, compact = false) {
  const evidence = getEvidence(item);
  if (!evidence) return '';
  return `
    <span class="evidence-badge evidence-${evidence.className}${compact ? ' is-compact' : ''}" title="${escapeHtml(evidence.ja)}" aria-label="Evidence: ${escapeHtml(evidence.label)}。${escapeHtml(evidence.ja)}">
      <i aria-hidden="true"></i><span>${escapeHtml(evidence.label)}</span>
    </span>
  `;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function renderFieldMark(item, compact = false) {
  const evidence = getEvidence(item);
  const random = seededRandom(hashString(`${item.id}|${item.category}|${evidence?.label || ''}`));
  const points = Array.from({ length: 4 }, (_, index) => ({
    x: Math.round(12 + random() * 40),
    y: Math.round(11 + random() * 42),
    radius: index === 0 ? 3 : 2
  }));
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const guideX = Math.round(16 + random() * 31);
  const guideY = Math.round(16 + random() * 31);
  return `
    <svg class="field-mark${compact ? ' is-compact' : ''}" viewBox="0 0 64 64" aria-hidden="true" focusable="false" data-evidence="${escapeHtml(evidence?.className || 'none')}">
      <path class="mark-frame" d="M8 16V8H16 M48 8H56V16 M56 48V56H48 M16 56H8V48" />
      <path class="mark-guide" d="M${guideX} 8V56 M8 ${guideY}H56" />
      <path class="mark-primary" d="${path}" />
      ${points.map((point, index) => `<circle class="mark-node node-${index}" cx="${point.x}" cy="${point.y}" r="${point.radius}" />`).join('')}
    </svg>
  `;
}

function renderTechniqueRow(item) {
  const tags = (item.tags || []).slice(0, 3);
  const isTransitionTarget = item.id === lastSelectedId;
  return `
    <a class="technique-row${isTransitionTarget ? ' is-transition-target' : ''}" href="#/${encodeURIComponent(item.id)}" data-technique-id="${escapeHtml(item.id)}">
      <div class="row-index"><span>${escapeHtml(getTechniqueNumber(item))}</span></div>
      <div class="row-main">
        <div class="row-meta">
          <span>${escapeHtml(item.category)}</span>
          ${renderEvidenceBadge(item, true)}
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        ${tags.length ? `<div class="row-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="row-mark">${renderFieldMark(item, true)}</div>
      <div class="row-side">
        <time datetime="${escapeHtml(item.updated)}">${escapeHtml(formatDate(item.updated))}</time>
        <span class="row-arrow" aria-hidden="true">↗</span>
      </div>
    </a>
  `;
}

function renderTechniqueResults(items) {
  if (!items.length) {
    return `
      <div class="empty">
        <strong>近いTechniqueがない。</strong>
        <p>検索語を短くするか、カテゴリを「すべて」に戻してみて。</p>
      </div>
    `;
  }
  return `<div class="technique-list">${items.map(renderTechniqueRow).join('')}</div>`;
}

function getSearchReadout(items) {
  if (searchQuery.trim()) return `${items.length} MATCH${items.length === 1 ? '' : 'ES'}`;
  if (activeCategory !== 'すべて') return `${items.length} IN CATEGORY`;
  return `${techniques.length} RECORDS`;
}

function updateSearchReadout(items, announceChange = true) {
  const readout = document.querySelector('#searchReadout');
  const shell = document.querySelector('.command-search');
  if (readout) readout.textContent = getSearchReadout(items);
  if (shell) {
    shell.style.setProperty('--match-ratio', String(techniques.length ? items.length / techniques.length : 0));
    shell.classList.toggle('has-query', Boolean(searchQuery.trim()));
  }
  if (!announceChange) return;
  window.clearTimeout(searchAnnouncementTimer);
  searchAnnouncementTimer = window.setTimeout(() => {
    announce(searchQuery.trim()
      ? `${items.length}件のTechniqueが見つかりました。`
      : `${items.length}件のTechniqueを表示しています。`);
  }, 220);
}

function updateLibrary(animate = true) {
  const items = getFilteredItems();
  const host = document.querySelector('#libraryResults');
  if (!host) return;
  const previousRects = new Map();
  if (animate && !reduceMotion.matches) {
    host.querySelectorAll('.technique-row').forEach(row => {
      previousRects.set(row.dataset.techniqueId, row.getBoundingClientRect());
    });
  }
  host.innerHTML = renderTechniqueResults(items);
  const isFiltered = Boolean(searchQuery.trim()) || activeCategory !== 'すべて';
  const eyebrow = document.querySelector('#libraryEyebrow');
  const title = document.querySelector('#libraryTitle');
  const count = document.querySelector('#libraryCount');
  if (eyebrow) eyebrow.textContent = isFiltered ? 'RESULTS / 検索結果' : 'RECENT / 最近追加';
  if (title) title.textContent = isFiltered ? '条件に合うTechnique' : '最近のTechnique';
  if (count) count.textContent = `${items.length} / ${techniques.length}`;
  updateSearchReadout(items);
  document.querySelectorAll('[data-category]').forEach(button => {
    const active = button.dataset.category === activeCategory;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (!animate || reduceMotion.matches || !Element.prototype.animate) return;
  host.querySelectorAll('.technique-row').forEach(row => {
    const previous = previousRects.get(row.dataset.techniqueId);
    if (!previous) {
      row.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100, easing: 'ease-out' });
      return;
    }
    const next = row.getBoundingClientRect();
    const deltaY = previous.top - next.top;
    if (Math.abs(deltaY) < 1) return;
    row.animate([
      { transform: `translateY(${deltaY}px)`, opacity: 0.88 },
      { transform: 'translateY(0)', opacity: 1 }
    ], { duration: 140, easing: 'cubic-bezier(.2,.7,.2,1)' });
  });
}

function bindHomeEvents() {
  const input = document.querySelector('#search');
  input?.addEventListener('input', event => {
    searchQuery = event.target.value;
    updateLibrary(true);
  });
  input?.addEventListener('focus', () => {
    document.querySelector('.command-search')?.classList.add('is-engaged');
    const readout = document.querySelector('#searchReadout');
    if (readout && !searchQuery.trim()) readout.textContent = `SEARCH ${getFilteredItems().length} RECORDS`;
  });
  input?.addEventListener('blur', () => {
    document.querySelector('.command-search')?.classList.remove('is-engaged');
    updateSearchReadout(getFilteredItems(), false);
  });
  document.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      updateLibrary(true);
    });
  });
}

function renderHome() {
  document.title = 'Techniques — Personal Field Instrument';
  const categories = ['すべて', ...new Set(techniques.map(item => item.category))];
  const items = getFilteredItems();
  const since = formatSinceDate();
  const isFiltered = Boolean(searchQuery.trim()) || activeCategory !== 'すべて';
  app.innerHTML = `
    <section class="manual-intro" aria-labelledby="manualTitle">
      <div class="manual-intro-copy">
        <p class="eyebrow">PERSONAL FIELD INSTRUMENT / やり方の記憶装置</p>
        <h1 id="manualTitle">やり方を、すぐ思い出す。</h1>
        <p>「知っている」を「すぐできる」に戻すための、自分用の小さな手順集。</p>
      </div>
      <div class="growth-record" aria-label="Techniqueの蓄積記録">
        <span><strong>${techniques.length}</strong> TECHNIQUES</span>
        <span><strong>${categories.length - 1}</strong> CATEGORIES</span>
        ${since ? `<span>SINCE <strong>${escapeHtml(since)}</strong></span>` : ''}
      </div>
      <div class="command-search" role="search" style="--match-ratio:${techniques.length ? items.length / techniques.length : 0}">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input id="search" class="search-box" type="search" autocomplete="off"
          placeholder="何をしたい？  MOV / Claude / 不安 / 発声…"
          value="${escapeHtml(searchQuery)}" aria-label="やり方を検索">
        <span id="searchReadout" class="search-readout" aria-hidden="true">${escapeHtml(getSearchReadout(items))}</span>
        <kbd>/</kbd>
      </div>
      <p class="search-hint">タイトル・タグ・本文まで検索</p>
    </section>
    <section class="library-tools" aria-label="Techniquesを絞り込む">
      <div class="filters" aria-label="カテゴリで絞り込む">
        ${categories.map(category => {
          const active = category === activeCategory;
          return `<button class="chip ${active ? 'is-active' : ''}" data-category="${escapeHtml(category)}" type="button" aria-pressed="${active}">${escapeHtml(category)}</button>`;
        }).join('')}
      </div>
    </section>
    <section class="library" aria-labelledby="libraryTitle">
      <div class="section-head">
        <div>
          <p id="libraryEyebrow" class="eyebrow">${isFiltered ? 'RESULTS / 検索結果' : 'RECENT / 最近追加'}</p>
          <h2 id="libraryTitle">${isFiltered ? '条件に合うTechnique' : '最近のTechnique'}</h2>
        </div>
        <span id="libraryCount" class="count">${items.length} / ${techniques.length}</span>
      </div>
      <div id="libraryResults">${renderTechniqueResults(items)}</div>
    </section>
  `;
  bindHomeEvents();
  requestAnimationFrame(() => {
    window.scrollTo({ top: homeScrollPosition, behavior: 'auto' });
    if (pendingSearchFocus) {
      pendingSearchFocus = false;
      document.querySelector('#search')?.focus({ preventScroll: true });
    }
    if (pendingRandomId) {
      const id = pendingRandomId;
      pendingRandomId = '';
      revealRandomTechnique(id);
    }
  });
}

function renderCommand(command, index) {
  return `
    <div class="command">
      <div class="command-head">
        <span>${escapeHtml(command.label)}</span>
        <button class="copy-btn" type="button" data-copy="${index}" data-copy-label="${escapeHtml(command.label)}" aria-label="${escapeHtml(command.label)}をコピー">COPY</button>
      </div>
      <pre><code>${escapeHtml(command.code)}</code></pre>
      ${command.note ? `<p class="command-note">${escapeHtml(command.note)}</p>` : ''}
    </div>
  `;
}

function renderSectionLabel(en, ja) {
  return `<div class="section-label"><span>${escapeHtml(en)}</span><strong>${escapeHtml(ja)}</strong></div>`;
}

function bindCopyEvents(item) {
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const command = item.commands[Number(button.dataset.copy)]?.code;
      if (!command) return;
      const commandBlock = button.closest('.command');
      window.clearTimeout(copyResetTimer);
      try {
        await navigator.clipboard.writeText(command);
        button.textContent = 'COPIED ✓';
        button.setAttribute('aria-label', `${button.closest('.command-head')?.querySelector('span')?.textContent || 'コマンド'}をコピーしました`);
        commandBlock?.classList.remove('is-copied');
        requestAnimationFrame(() => commandBlock?.classList.add('is-copied'));
        announce('コマンドをコピーしました。');
        copyResetTimer = window.setTimeout(() => {
          button.textContent = 'COPY';
          button.setAttribute('aria-label', `${button.dataset.copyLabel || 'コマンド'}をコピー`);
          commandBlock?.classList.remove('is-copied');
        }, 1200);
      } catch {
        button.textContent = 'COPY FAILED';
        announce('コピーできませんでした。コードを選択してコピーしてください。');
        copyResetTimer = window.setTimeout(() => {
          button.textContent = 'COPY';
          button.setAttribute('aria-label', `${button.dataset.copyLabel || 'コマンド'}をコピー`);
        }, 1600);
      }
    });
  });
}

function renderArticle(item) {
  document.title = `${item.title} — Techniques`;
  const evidence = getEvidence(item);
  app.innerHTML = `
    <article class="article">
      <div class="article-utility">
        <a class="back" href="#/">← Library</a>
        <div class="article-code"><span>${escapeHtml(getTechniqueNumber(item))}</span>${renderEvidenceBadge(item)}</div>
      </div>
      <header class="article-header">
        <div class="article-header-grid">
          <div class="article-heading-copy">
            <p class="eyebrow">${escapeHtml(item.category)}</p>
            <h1>${escapeHtml(item.title)}</h1>
          </div>
          <div class="article-mark">${renderFieldMark(item)}</div>
        </div>
        <p class="article-meta">更新 ${escapeHtml(formatDate(item.updated))}　·　${(item.tags || []).slice(0, 5).map(escapeHtml).join(' / ')}</p>
        <p class="article-summary">${escapeHtml(item.summary)}</p>
      </header>
      <section class="answer-box">${renderSectionLabel('QUICK ANSWER', 'まずこれ')}<div>${escapeHtml(item.quickAnswer)}</div></section>
      ${item.commands?.length ? `<section class="article-section">${renderSectionLabel('EXAMPLE', 'コピペ用')}${item.commands.map(renderCommand).join('')}</section>` : ''}
      ${item.steps?.length ? `<section class="article-section procedure">${renderSectionLabel('PROCEDURE', '手順')}<ol>${item.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></section>` : ''}
      ${item.explanation?.length ? `<section class="article-section">${renderSectionLabel('WHY', 'なぜ？')}<div class="explanation-list">${item.explanation.map(row => `<div class="explanation-row"><code>${escapeHtml(row.term)}</code><p>${escapeHtml(row.text)}</p></div>`).join('')}</div></section>` : ''}
      ${item.tips?.length ? `<section class="article-section notes-section">${renderSectionLabel('CAUTION / NOTES', '注意・補足')}<ul>${item.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}</ul></section>` : ''}
      ${evidence ? `<section class="evidence-note">${renderSectionLabel('EVIDENCE', '根拠の強さ')}<div class="evidence-note-body">${renderEvidenceBadge(item)}<p>${escapeHtml(item.evidence?.note || evidence.ja)}</p></div></section>` : ''}
      ${item.sources?.length ? `<section class="article-section sources">${renderSectionLabel('SOURCE', '参考')}<ul>${item.sources.map(source => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>` : ''}
    </article>
  `;
  bindCopyEvents(item);
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
}

function renderNotFound() {
  document.title = '見つかりません — Techniques';
  app.innerHTML = `<section class="article"><a class="back" href="#/">← Library</a><div class="empty">そのTechniqueは見つからへんかった。</div></section>`;
}

function route() {
  const path = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  lastRenderedHash = location.hash;
  if (!path) {
    renderHome();
    return;
  }
  const item = techniques.find(entry => entry.id === path);
  item ? renderArticle(item) : renderNotFound();
}

function runViewTransition(update) {
  if (!document.startViewTransition || reduceMotion.matches) {
    update();
    return;
  }
  document.documentElement.classList.add('is-route-transitioning');
  const transition = document.startViewTransition(update);
  transition.finished.finally(() => document.documentElement.classList.remove('is-route-transitioning'));
}

function navigateToHash(hash, { replace = false } = {}) {
  if (hash === location.hash) {
    route();
    return;
  }
  runViewTransition(() => {
    history[replace ? 'replaceState' : 'pushState'](null, '', hash);
    route();
  });
}

function scheduleHistoryRoute() {
  if (routeScheduled) return;
  routeScheduled = true;
  queueMicrotask(() => {
    routeScheduled = false;
    if (lastRenderedHash === location.hash) return;
    runViewTransition(route);
  });
}

function saveHomePosition() {
  homeScrollPosition = window.scrollY;
  writeSession('techniques:home-scroll', homeScrollPosition);
}

function chooseRandomTechnique() {
  const pool = location.hash && location.hash !== '#/' ? techniques : getFilteredItems();
  const candidates = pool.length ? pool : techniques;
  if (!candidates.length) return null;
  const alternatives = candidates.length > 1 ? candidates.filter(item => item.id !== lastSelectedId) : candidates;
  return alternatives[Math.floor(Math.random() * alternatives.length)] || candidates[0];
}

function revealRandomTechnique(id) {
  const row = [...document.querySelectorAll('[data-technique-id]')]
    .find(element => element.dataset.techniqueId === id);
  const item = techniques.find(entry => entry.id === id);
  if (!row || !item) return;
  document.querySelectorAll('.is-random-hit').forEach(element => element.classList.remove('is-random-hit'));
  row.classList.add('is-random-hit');
  row.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  window.setTimeout(() => row.focus({ preventScroll: true }), reduceMotion.matches ? 0 : 180);
  window.setTimeout(() => row.classList.remove('is-random-hit'), reduceMotion.matches ? 500 : 900);
  announce(`Random Technique。${getTechniqueNumber(item)}、${item.title}`);
}

function handleRandom() {
  const item = chooseRandomTechnique();
  if (!item) return;
  if (location.hash && location.hash !== '#/') {
    pendingRandomId = item.id;
    navigateToHash('#/');
    return;
  }
  revealRandomTechnique(item.id);
}

async function init() {
  try {
    const response = await fetch('data/techniques.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    techniques = await response.json();
    buildTechniqueNumbers();
    techniques.sort((a, b) => String(b.updated).localeCompare(String(a.updated)) || String(b.number || '').localeCompare(String(a.number || '')));
    techniques.forEach(searchableText);
    if (techniqueCount) techniqueCount.textContent = `${techniques.length} ITEMS`;
    document.querySelector('#randomTechnique')?.addEventListener('click', handleRandom);
    route();
  } catch (error) {
    console.error(error);
    app.innerHTML = '<div class="empty">データを読み込めへんかった。ページを再読み込みしてみて。</div>';
  }
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#/"]');
  if (!link) return;
  event.preventDefault();
  const id = link.dataset.techniqueId;
  if (id) {
    saveHomePosition();
    document.querySelectorAll('.technique-row.is-transition-target').forEach(row => {
      row.classList.remove('is-transition-target');
    });
    lastSelectedId = id;
    writeSession('techniques:last-selected', id);
    link.classList.add('is-transition-target');
  }
  navigateToHash(link.getAttribute('href'));
});

window.addEventListener('popstate', scheduleHistoryRoute);
window.addEventListener('hashchange', scheduleHistoryRoute);
window.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    pendingSearchFocus = true;
    if (location.hash && location.hash !== '#/') {
      homeScrollPosition = 0;
      writeSession('techniques:home-scroll', 0);
      navigateToHash('#/');
    }
    else {
      pendingSearchFocus = false;
      document.querySelector('#search')?.focus();
    }
  }
  if (event.key === 'Escape' && location.hash && location.hash !== '#/') {
    event.preventDefault();
    navigateToHash('#/');
  }
});

init();
