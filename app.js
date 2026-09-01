const app = document.querySelector('#app');
const techniqueCount = document.querySelector('#techniqueCount');
const siteStatus = document.querySelector('#siteStatus');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let techniques = [];
let categoryOrder = [];
let activeCategory = 'すべて';
let searchQuery = '';
let lastRenderedHash = location.hash;
let lastSelectedId = readSession('techniques:last-selected') || '';
let homeScrollPosition = Number(readSession('techniques:home-scroll')) || 0;
let pendingRandomId = '';
let pendingSearchFocus = false;
let pendingReturnFocus = false;
let pendingArticleFocus = false;
let routeScheduled = false;
let searchAnnouncementTimer = 0;
let copyResetTimer = 0;
let lastInteractionWasKeyboard = false;
const searchIndex = new Map();

const FIELD_PALETTE = {
  'PC・スマホ': { color: '#315f91', soft: '#e8eef5', name: 'SIGNAL BLUE' },
  '動画・音声': { color: '#8a4f7d', soft: '#f3e8ef', name: 'TAPE PLUM' },
  'Web・開発': { color: '#236c66', soft: '#e3f0ee', name: 'TERMINAL TEAL' },
  '仕事・事務': { color: '#5f6540', soft: '#edefe1', name: 'DESK MOSS' },
  '暮らし': { color: '#a15c3f', soft: '#f4e7df', name: 'CLAY' },
  'お金': { color: '#8a6a22', soft: '#f3ecd8', name: 'LEDGER OCHRE' },
  '移動・旅行': { color: '#3f7080', soft: '#e5eff2', name: 'ROUTE BLUE' },
  '健康・身体': { color: '#a34f4e', soft: '#f5e3e2', name: 'PULSE CORAL' },
  '思考・学習': { color: '#66538f', soft: '#ece7f4', name: 'THOUGHT VIOLET' },
  '文章・表現': { color: '#9a4f68', soft: '#f4e4e9', name: 'INK BLOOM' },
  'その他': { color: '#6d6b62', soft: '#eceae5', name: 'FIELD GRAY' }
};
const DEFAULT_FIELD = { color: '#184f42', soft: '#dfece7', name: 'ALL FIELDS' };

function getFieldPalette(value) {
  const category = typeof value === 'string' ? value : value?.category;
  return FIELD_PALETTE[category] || DEFAULT_FIELD;
}

function renderFieldStyle(value) {
  const field = getFieldPalette(value);
  return `--field-color:${field.color};--field-soft:${field.soft}`;
}

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
  return new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric' }).format(date);
}

function getTechniqueNumber(item) {
  return item.number || 'T-000';
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

function getSearchScore(item, query) {
  const tokens = query.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const fullText = searchableText(item);
  if (!tokens.every(token => fullText.includes(token))) return -1;

  const title = normalize(item.title);
  const tags = normalize((item.tags || []).join(' '));
  const category = normalize(item.category);
  const summary = normalize(item.summary);
  const quickAnswer = normalize(item.quickAnswer);
  let score = title.includes(query) ? 80 : 0;

  tokens.forEach(token => {
    if (title.includes(token)) score += 32;
    if (tags.includes(token)) score += 20;
    if (category.includes(token)) score += 14;
    if (summary.includes(token)) score += 10;
    if (quickAnswer.includes(token)) score += 8;
  });
  return score;
}

function getFilteredItems() {
  const query = normalize(searchQuery.trim());
  return techniques
    .map((item, index) => ({ item, index, score: query ? getSearchScore(item, query) : 0 }))
    .filter(({ item, score }) => {
      const categoryMatch = activeCategory === 'すべて' || item.category === activeCategory;
      return categoryMatch && score >= 0;
    })
    .sort((a, b) => query ? b.score - a.score || a.index - b.index : a.index - b.index)
    .map(({ item }) => item);
}

function getAvailableCategories() {
  const used = new Set(techniques.map(item => item.category));
  return categoryOrder.filter(category => used.has(category));
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

function renderFieldMark(item) {
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
  const signatureSeed = hashString(`${item.id}|signature`);
  const signatureTicks = Array.from({ length: 3 }, (_, index) => 16 + ((signatureSeed >>> (index * 5)) & 23));
  const categoryIndex = Math.max(0, categoryOrder.indexOf(item.category));
  const categoryTick = 16 + ((categoryIndex * 5) % 28);
  return `
    <svg class="field-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false" data-evidence="${escapeHtml(evidence?.className || 'none')}">
      <path class="mark-frame" d="M8 16V8H16 M48 8H56V16 M56 48V56H48 M16 56H8V48" />
      <path class="mark-guide" d="M${guideX} 8V56 M8 ${guideY}H56" />
      ${signatureTicks.map(x => `<path class="mark-signature" d="M${x} 5V8" />`).join('')}
      <path class="mark-signature" d="M56 ${categoryTick}H59" />
      <path class="mark-primary" d="${path}" />
      ${points.map((point, index) => `<circle class="mark-node node-${index}" cx="${point.x}" cy="${point.y}" r="${point.radius}" />`).join('')}
    </svg>
  `;
}


function renderFieldShelf() {
  const shelfItems = [...techniques].sort((a, b) => getTechniqueNumber(a).localeCompare(getTechniqueNumber(b)));
  return `
    <section id="fieldShelf" class="field-shelf" aria-labelledby="fieldShelfTitle">
      <div class="field-shelf-head">
        <div>
          <span>FIELD SHELF</span>
          <strong id="fieldShelfTitle">技の標本棚</strong>
        </div>
        <small>${techniques.length} SPECIMENS / BROWSE WITHOUT A QUERY</small>
      </div>
      <div class="field-shelf-track">
        ${shelfItems.map(item => `
          <a class="field-shelf-item" href="#/${encodeURIComponent(item.id)}" data-technique-id="${escapeHtml(item.id)}" style="${renderFieldStyle(item)}" title="${escapeHtml(getTechniqueNumber(item))} · ${escapeHtml(getFieldPalette(item).name)}" aria-label="${escapeHtml(getTechniqueNumber(item))} ${escapeHtml(item.title)}">
            <span class="shelf-mark">${renderFieldMark(item)}</span>
            <span class="shelf-code">${escapeHtml(getTechniqueNumber(item))}</span>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

function renderTechniqueRow(item) {
  const isTransitionTarget = item.id === lastSelectedId;
  return `
    <a class="technique-row${isTransitionTarget ? ' is-transition-target' : ''}" href="#/${encodeURIComponent(item.id)}" data-technique-id="${escapeHtml(item.id)}" style="${renderFieldStyle(item)}">
      <div class="row-index"><span>${escapeHtml(getTechniqueNumber(item))}</span></div>
      <div class="row-main">
        <div class="row-meta">
          <span>${escapeHtml(item.category)}</span>
          ${renderEvidenceBadge(item, true)}
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
      </div>
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
  if (readout) readout.textContent = getSearchReadout(items);
  if (!announceChange) return;
  window.clearTimeout(searchAnnouncementTimer);
  searchAnnouncementTimer = window.setTimeout(() => {
    announce(searchQuery.trim()
      ? `${items.length}件のTechniqueが見つかりました。`
      : `${items.length}件のTechniqueを表示しています。`);
  }, 400);
}

function updateLibrary() {
  const items = getFilteredItems();
  const host = document.querySelector('#libraryResults');
  if (!host) return;
  host.innerHTML = renderTechniqueResults(items);
  const isFiltered = Boolean(searchQuery.trim()) || activeCategory !== 'すべて';
  const shelf = document.querySelector('#fieldShelf');
  if (shelf) shelf.hidden = isFiltered;
  const title = document.querySelector('#libraryTitle');
  const count = document.querySelector('#libraryCount');
  if (title) title.textContent = isFiltered ? '条件に合うTechnique' : '最近のTechnique';
  if (count) count.textContent = `${items.length} / ${techniques.length}`;
  updateSearchReadout(items);
  document.querySelectorAll('[data-category]').forEach(button => {
    const active = button.dataset.category === activeCategory;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function getResultRows() {
  return [...document.querySelectorAll('#libraryResults .technique-row')];
}

function focusResultRow(row) {
  if (!row) return;
  row.focus({ preventScroll: true });
  row.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}

function bindHomeEvents() {
  const input = document.querySelector('#search');
  const results = document.querySelector('#libraryResults');

  input?.addEventListener('input', event => {
    searchQuery = event.target.value;
    updateLibrary();
  });
  input?.addEventListener('focus', () => {
    const readout = document.querySelector('#searchReadout');
    if (readout && !searchQuery.trim()) readout.textContent = `SEARCH ${getFilteredItems().length} RECORDS`;
  });
  input?.addEventListener('blur', () => updateSearchReadout(getFilteredItems(), false));
  input?.addEventListener('keydown', event => {
    if (event.isComposing) return;
    const rows = getResultRows();
    if (event.key === 'ArrowDown' && rows.length) {
      event.preventDefault();
      focusResultRow(rows[0]);
    }
    if (event.key === 'Enter' && rows.length === 1) {
      event.preventDefault();
      rows[0].click();
    }
  });

  results?.addEventListener('keydown', event => {
    if (event.isComposing || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const row = event.target.closest('.technique-row');
    if (!row) return;
    const rows = getResultRows();
    const index = rows.indexOf(row);
    if (index < 0) return;
    event.preventDefault();
    if (event.key === 'ArrowUp' && index === 0) {
      input?.focus({ preventScroll: true });
      return;
    }
    const nextIndex = event.key === 'ArrowDown'
      ? Math.min(index + 1, rows.length - 1)
      : Math.max(index - 1, 0);
    focusResultRow(rows[nextIndex]);
  });

  document.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', event => {
      activeCategory = button.dataset.category;
      updateLibrary();
      event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    });
  });
}

function renderHome() {
  document.title = 'Techniques — Personal Field Instrument';
  const categories = ['すべて', ...getAvailableCategories()];
  const items = getFilteredItems();
  const isFiltered = Boolean(searchQuery.trim()) || activeCategory !== 'すべて';
  app.innerHTML = `
    <section class="manual-intro" aria-labelledby="manualTitle">
      <div class="manual-intro-copy">
        <p class="eyebrow">PERSONAL FIELD INSTRUMENT / やり方の記憶装置</p>
        <h1 id="manualTitle">やり方を、すぐ思い出す。</h1>
        <p>「知っている」を「すぐできる」に戻すための、自分用の小さな手順集。</p>
      </div>
      <div class="command-search" role="search">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input id="search" class="search-box" type="search" autocomplete="off"
          placeholder="何をしたい？  MOV / Claude / 不安 / 発声…"
          value="${escapeHtml(searchQuery)}" aria-label="やり方を検索"
          aria-controls="libraryResults" aria-keyshortcuts="ArrowDown">
        <span id="searchReadout" class="search-readout" aria-hidden="true">${escapeHtml(getSearchReadout(items))}</span>
        <kbd>/</kbd>
      </div>
    </section>
    ${renderFieldShelf()}
    <section class="library-tools" aria-label="Techniquesを絞り込む">
      <div class="filters" aria-label="カテゴリで絞り込む">
        ${categories.map(category => {
          const active = category === activeCategory;
          return `<button class="chip ${active ? 'is-active' : ''}" data-category="${escapeHtml(category)}" type="button" style="${renderFieldStyle(category)}" aria-pressed="${active}">${escapeHtml(category)}</button>`;
        }).join('')}
      </div>
    </section>
    <section class="library" aria-labelledby="libraryTitle">
      <div class="section-head">
        <div>
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
      pendingReturnFocus = false;
      document.querySelector('#search')?.focus({ preventScroll: true });
      return;
    }
    if (pendingRandomId) {
      const id = pendingRandomId;
      pendingRandomId = '';
      pendingReturnFocus = false;
      revealRandomTechnique(id);
      return;
    }
    if (pendingReturnFocus && lastSelectedId) {
      pendingReturnFocus = false;
      document.querySelector(`[data-technique-id="${CSS.escape(lastSelectedId)}"]`)?.focus({ preventScroll: true });
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
      window.clearTimeout(copyResetTimer);
      try {
        await navigator.clipboard.writeText(command);
        button.textContent = 'COPIED ✓';
        button.setAttribute('aria-label', `${button.closest('.command-head')?.querySelector('span')?.textContent || 'コマンド'}をコピーしました`);
        announce('コマンドをコピーしました。');
        copyResetTimer = window.setTimeout(() => {
          button.textContent = 'COPY';
          button.setAttribute('aria-label', `${button.dataset.copyLabel || 'コマンド'}をコピー`);
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


function getFieldConnection(item) {
  const tags = new Set((item.tags || []).map(tag => normalize(tag)));
  const candidates = techniques.filter(candidate => candidate.id !== item.id);
  if (!candidates.length) return null;

  const ranked = candidates
    .map(candidate => {
      const sharedTags = (candidate.tags || []).filter(tag => tags.has(normalize(tag)));
      const sameCategory = candidate.category === item.category;
      return {
        candidate,
        sharedTags,
        sameCategory,
        score: sharedTags.length * 3 + (sameCategory ? 2 : 0),
        tie: hashString(`${item.id}|${candidate.id}|connection`)
      };
    })
    .sort((a, b) => b.score - a.score || a.tie - b.tie);

  const best = ranked[0];
  if (best?.score > 0) {
    return {
      item: best.candidate,
      relation: best.sharedTags.length ? 'SHARED SIGNAL' : 'SAME FIELD'
    };
  }

  const fallback = candidates[hashString(`${item.id}|odd-connection`) % candidates.length];
  return fallback ? { item: fallback, relation: 'ODD CONNECTION' } : null;
}

function renderFieldConnection(item) {
  const connection = getFieldConnection(item);
  if (!connection) return '';
  return `
    <section class="field-connection" aria-label="もうひとつのTechnique">
      <p class="field-connection-kicker">ONE MORE <span>つながったTechnique</span></p>
      <a href="#/${encodeURIComponent(connection.item.id)}" data-technique-id="${escapeHtml(connection.item.id)}" style="${renderFieldStyle(connection.item)}">
        <span class="field-connection-code">${escapeHtml(getTechniqueNumber(connection.item))}</span>
        <span class="field-connection-copy"><small>${escapeHtml(connection.relation)}</small><strong>${escapeHtml(connection.item.title)}</strong></span>
        <span class="field-connection-mark" aria-hidden="true">${renderFieldMark(connection.item)}</span>
      </a>
    </section>
  `;
}

function renderArticle(item) {
  document.title = `${item.title} — Techniques`;
  const evidence = getEvidence(item);
  app.innerHTML = `
    <article class="article" aria-labelledby="articleTitle" style="${renderFieldStyle(item)}">
      <div class="article-utility">
        <a class="back" href="#/">← Library</a>
        <div class="article-code"><span>${escapeHtml(getTechniqueNumber(item))}</span>${renderEvidenceBadge(item)}</div>
      </div>
      <header class="article-header">
        <div class="article-header-grid">
          <div class="article-heading-copy">
            <p class="eyebrow article-field-label"><i aria-hidden="true"></i><span>${escapeHtml(item.category)}</span><small>${escapeHtml(getFieldPalette(item).name)}</small></p>
            <h1 id="articleTitle" tabindex="-1">${escapeHtml(item.title)}</h1>
          </div>
          <div class="article-mark">${renderFieldMark(item)}</div>
        </div>
        <p class="article-meta">更新 ${escapeHtml(formatDate(item.updated))}</p>
        <p class="article-summary">${escapeHtml(item.summary)}</p>
      </header>
      <section class="answer-box">${renderSectionLabel('QUICK ANSWER', 'まずこれ')}<div>${escapeHtml(item.quickAnswer)}</div></section>
      ${item.commands?.length ? `<section class="article-section">${renderSectionLabel('EXAMPLE', 'コピペ用')}${item.commands.map(renderCommand).join('')}</section>` : ''}
      ${item.steps?.length ? `<section class="article-section procedure">${renderSectionLabel('PROCEDURE', '手順')}<ol>${item.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></section>` : ''}
      ${item.explanation?.length ? `<section class="article-section">${renderSectionLabel('WHY', 'なぜ？')}<div class="explanation-list">${item.explanation.map(row => `<div class="explanation-row"><code>${escapeHtml(row.term)}</code><p>${escapeHtml(row.text)}</p></div>`).join('')}</div></section>` : ''}
      ${item.tips?.length ? `<section class="article-section notes-section">${renderSectionLabel('CAUTION / NOTES', '注意・補足')}<ul>${item.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}</ul></section>` : ''}
      ${evidence ? `<section class="evidence-note">${renderSectionLabel('EVIDENCE', '根拠の強さ')}<div class="evidence-note-body">${renderEvidenceBadge(item)}<p>${escapeHtml(item.evidence?.note || evidence.ja)}</p></div></section>` : ''}
      ${item.sources?.length ? `<section class="article-section sources">${renderSectionLabel('SOURCE', '参考')}<ul>${item.sources.map(source => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>` : ''}
      ${renderFieldConnection(item)}
    </article>
  `;
  bindCopyEvents(item);
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (pendingArticleFocus) {
      pendingArticleFocus = false;
      document.querySelector('#articleTitle')?.focus({ preventScroll: true });
    }
  });
}

function renderNotFound() {
  document.title = '見つかりません — Techniques';
  app.innerHTML = `<section class="article"><a class="back" href="#/">← Library</a><div class="empty">そのTechniqueは見つからへんかった。</div></section>`;
}

function route() {
  const previousHash = lastRenderedHash;
  const path = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  lastRenderedHash = location.hash;
  if (!path) {
    if (previousHash && previousHash !== '#/' && lastInteractionWasKeyboard && !pendingSearchFocus && !pendingRandomId) {
      pendingReturnFocus = true;
    }
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
  const filtered = getFilteredItems();
  const candidates = filtered.length ? filtered : techniques;
  if (!candidates.length) return null;
  const alternatives = candidates.length > 1 ? candidates.filter(item => item.id !== lastSelectedId) : candidates;
  return alternatives[Math.floor(Math.random() * alternatives.length)] || candidates[0];
}

function revealRandomTechnique(id) {
  const matchingTargets = [...document.querySelectorAll('[data-technique-id]')]
    .filter(element => element.dataset.techniqueId === id);
  const row = matchingTargets.find(element => !element.closest('[hidden]')) || matchingTargets[0];
  const item = techniques.find(entry => entry.id === id);
  if (!row || !item) return;
  document.querySelectorAll('.is-random-hit').forEach(element => element.classList.remove('is-random-hit'));
  row.classList.add('is-random-hit');
  row.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  window.setTimeout(() => row.focus({ preventScroll: true }), reduceMotion.matches ? 0 : 160);
  window.setTimeout(() => row.classList.remove('is-random-hit'), reduceMotion.matches ? 450 : 700);
  announce(`Wander。${getTechniqueNumber(item)}、${item.title}`);
}

function handleRandom() {
  const item = chooseRandomTechnique();
  if (!item) return;
  pendingReturnFocus = false;
  pendingArticleFocus = false;
  if (location.hash && location.hash !== '#/') {
    pendingRandomId = item.id;
    navigateToHash('#/');
    return;
  }
  revealRandomTechnique(item.id);
}

async function init() {
  try {
    const [techniqueResponse, categoryResponse] = await Promise.all([
      fetch('data/techniques.json', { cache: 'no-store' }),
      fetch('data/categories.json', { cache: 'no-store' })
    ]);
    if (!techniqueResponse.ok) throw new Error(`Techniques HTTP ${techniqueResponse.status}`);
    if (!categoryResponse.ok) throw new Error(`Categories HTTP ${categoryResponse.status}`);
    techniques = await techniqueResponse.json();
    categoryOrder = await categoryResponse.json();
    techniques.sort((a, b) => String(b.updated).localeCompare(String(a.updated)) || String(b.number).localeCompare(String(a.number)));
    techniques.forEach(searchableText);
    if (techniqueCount) techniqueCount.textContent = `${techniques.length} ITEMS`;
    document.querySelector('#randomTechnique')?.addEventListener('click', handleRandom);
    route();
  } catch (error) {
    console.error(error);
    app.innerHTML = '<div class="empty">データを読み込めへんかった。ページを再読み込みしてみて。</div>';
  }
}

document.addEventListener('pointerdown', () => {
  lastInteractionWasKeyboard = false;
}, true);

document.addEventListener('keydown', () => {
  lastInteractionWasKeyboard = true;
}, true);

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#/"]');
  if (!link) return;
  event.preventDefault();
  const id = link.dataset.techniqueId;
  if (id) {
    if (link.classList.contains('technique-row') || link.classList.contains('field-shelf-item')) saveHomePosition();
    document.querySelectorAll('.technique-row.is-transition-target').forEach(row => {
      row.classList.remove('is-transition-target');
    });
    lastSelectedId = id;
    writeSession('techniques:last-selected', id);
    pendingArticleFocus = lastInteractionWasKeyboard;
    pendingReturnFocus = false;
    link.classList.add('is-transition-target');
  } else if (location.hash && location.hash !== '#/' && !pendingSearchFocus && !pendingRandomId) {
    pendingReturnFocus = lastInteractionWasKeyboard;
  }
  navigateToHash(link.getAttribute('href'));
});

window.addEventListener('popstate', scheduleHistoryRoute);
window.addEventListener('hashchange', scheduleHistoryRoute);
window.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    pendingSearchFocus = true;
    pendingReturnFocus = false;
    if (location.hash && location.hash !== '#/') {
      homeScrollPosition = 0;
      writeSession('techniques:home-scroll', 0);
      navigateToHash('#/');
    } else {
      pendingSearchFocus = false;
      document.querySelector('#search')?.focus();
    }
  }
  if (event.key === 'Escape' && location.hash && location.hash !== '#/') {
    event.preventDefault();
    pendingReturnFocus = true;
    navigateToHash('#/');
  }
});

init();
