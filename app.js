const app = document.querySelector('#app');
const techniqueCount = document.querySelector('#techniqueCount');
let techniques = [];
let activeCategory = 'すべて';
let searchQuery = '';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const normalize = (value = '') => String(value).toLowerCase().normalize('NFKC');

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'short', day: 'numeric'
  }).format(date);
}

function getTechniqueNumber(item) {
  if (item.number) return item.number;
  const creationOrder = [...techniques]
    .sort((a, b) => String(a.updated).localeCompare(String(b.updated)) || String(a.id).localeCompare(String(b.id)));
  const index = creationOrder.findIndex(entry => entry.id === item.id);
  return `T-${String(Math.max(index, 0) + 1).padStart(3, '0')}`;
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
  const commandText = (item.commands || []).flatMap(command => [command.label, command.code, command.note]);
  const explanationText = (item.explanation || []).flatMap(row => [row.term, row.text]);
  const sourceText = (item.sources || []).flatMap(source => [source.label, source.url]);

  return normalize([
    getTechniqueNumber(item),
    item.title,
    item.summary,
    item.category,
    ...(item.tags || []),
    item.quickAnswer,
    ...(item.steps || []),
    ...commandText,
    ...explanationText,
    ...(item.tips || []),
    ...sourceText
  ].filter(Boolean).join(' '));
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
    <span class="evidence-badge evidence-${evidence.className}${compact ? ' is-compact' : ''}" title="${escapeHtml(evidence.ja)}">
      <i aria-hidden="true"></i>${escapeHtml(evidence.label)}
    </span>
  `;
}

function renderHome() {
  document.title = 'Techniques — Personal Field Manual';
  const categories = ['すべて', ...new Set(techniques.map(item => item.category))];
  const items = getFilteredItems();
  const isFiltered = Boolean(searchQuery.trim()) || activeCategory !== 'すべて';

  app.innerHTML = `
    <section class="manual-intro" aria-labelledby="manualTitle">
      <div class="manual-intro-copy">
        <p class="eyebrow">FIELD MANUAL / やり方の記憶装置</p>
        <h1 id="manualTitle">やり方を、すぐ思い出す。</h1>
        <p>「知っている」を「すぐできる」に戻すための、自分用の小さな手順集。</p>
      </div>

      <div class="command-search" role="search">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input
          id="search"
          class="search-box"
          type="search"
          autocomplete="off"
          placeholder="何をしたい？  MOV / Claude / 不安 / 発声…"
          value="${escapeHtml(searchQuery)}"
          aria-label="やり方を検索"
        >
        <kbd>/</kbd>
      </div>
      <p class="search-hint">タイトル・タグ・本文まで検索</p>
    </section>

    <section class="library-tools" aria-label="Techniquesを絞り込む">
      <div class="filters" aria-label="カテゴリで絞り込む">
        ${categories.map(category => `
          <button class="chip ${category === activeCategory ? 'is-active' : ''}" data-category="${escapeHtml(category)}" type="button">
            ${escapeHtml(category)}
          </button>
        `).join('')}
      </div>
    </section>

    <section class="library" aria-labelledby="libraryTitle">
      <div class="section-head">
        <div>
          <p class="eyebrow">${isFiltered ? 'RESULTS / 検索結果' : 'RECENT / 最近追加'}</p>
          <h2 id="libraryTitle">${isFiltered ? '条件に合うTechnique' : '最近のTechnique'}</h2>
        </div>
        <span class="count">${items.length} / ${techniques.length}</span>
      </div>

      ${items.length ? `
        <div class="technique-list">
          ${items.map(item => {
            const tags = (item.tags || []).slice(0, 3);
            return `
              <a class="technique-row" href="#/${encodeURIComponent(item.id)}">
                <div class="row-index">${escapeHtml(getTechniqueNumber(item))}</div>
                <div class="row-main">
                  <div class="row-meta">
                    <span>${escapeHtml(item.category)}</span>
                    ${renderEvidenceBadge(item, true)}
                  </div>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.summary)}</p>
                  ${tags.length ? `<div class="row-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                </div>
                <div class="row-side">
                  <time datetime="${escapeHtml(item.updated)}">${escapeHtml(formatDate(item.updated))}</time>
                  <span class="row-arrow" aria-hidden="true">↗</span>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="empty">
          <strong>近いTechniqueがない。</strong>
          <p>検索語を短くするか、カテゴリを「すべて」に戻してみて。</p>
        </div>
      `}
    </section>
  `;

  const input = document.querySelector('#search');
  input?.addEventListener('input', (event) => {
    searchQuery = event.target.value;
    const position = event.target.selectionStart;
    renderHome();
    const nextInput = document.querySelector('#search');
    nextInput?.focus();
    nextInput?.setSelectionRange(position, position);
  });

  document.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      renderHome();
    });
  });
}

function renderCommand(command, index) {
  return `
    <div class="command">
      <div class="command-head">
        <span>${escapeHtml(command.label)}</span>
        <button class="copy-btn" type="button" data-copy="${index}">コピー</button>
      </div>
      <pre><code>${escapeHtml(command.code)}</code></pre>
      ${command.note ? `<p class="command-note">${escapeHtml(command.note)}</p>` : ''}
    </div>
  `;
}

function renderSectionLabel(en, ja) {
  return `<div class="section-label"><span>${escapeHtml(en)}</span><strong>${escapeHtml(ja)}</strong></div>`;
}

function renderArticle(item) {
  document.title = `${item.title} — Techniques`;
  const evidence = getEvidence(item);

  app.innerHTML = `
    <article class="article">
      <div class="article-utility">
        <a class="back" href="#/">← Library</a>
        <div class="article-code">
          <span>${escapeHtml(getTechniqueNumber(item))}</span>
          ${renderEvidenceBadge(item)}
        </div>
      </div>

      <header class="article-header">
        <p class="eyebrow">${escapeHtml(item.category)}</p>
        <h1>${escapeHtml(item.title)}</h1>
        <p class="article-meta">更新 ${escapeHtml(formatDate(item.updated))}　·　${(item.tags || []).slice(0, 5).map(escapeHtml).join(' / ')}</p>
        <p class="article-summary">${escapeHtml(item.summary)}</p>
      </header>

      <section class="answer-box">
        ${renderSectionLabel('QUICK ANSWER', 'まずこれ')}
        <div>${escapeHtml(item.quickAnswer)}</div>
      </section>

      ${item.commands?.length ? `
        <section class="article-section">
          ${renderSectionLabel('EXAMPLE', 'コピペ用')}
          ${item.commands.map(renderCommand).join('')}
        </section>
      ` : ''}

      ${item.steps?.length ? `
        <section class="article-section procedure">
          ${renderSectionLabel('PROCEDURE', '手順')}
          <ol>
            ${item.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
          </ol>
        </section>
      ` : ''}

      ${item.explanation?.length ? `
        <section class="article-section">
          ${renderSectionLabel('WHY', 'なぜ？')}
          <div class="explanation-list">
            ${item.explanation.map(row => `
              <div class="explanation-row">
                <code>${escapeHtml(row.term)}</code>
                <p>${escapeHtml(row.text)}</p>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      ${item.tips?.length ? `
        <section class="article-section notes-section">
          ${renderSectionLabel('CAUTION / NOTES', '注意・補足')}
          <ul>
            ${item.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}
          </ul>
        </section>
      ` : ''}

      ${evidence ? `
        <section class="evidence-note">
          ${renderSectionLabel('EVIDENCE', '根拠の強さ')}
          <div class="evidence-note-body">
            ${renderEvidenceBadge(item)}
            <p>${escapeHtml(item.evidence?.note || evidence.ja)}</p>
          </div>
        </section>
      ` : ''}

      ${item.sources?.length ? `
        <section class="article-section sources">
          ${renderSectionLabel('SOURCE', '参考')}
          <ul>
            ${item.sources.map(source => `
              <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} <span aria-hidden="true">↗</span></a></li>
            `).join('')}
          </ul>
        </section>
      ` : ''}
    </article>
  `;

  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const command = item.commands[Number(button.dataset.copy)]?.code;
      if (!command) return;
      try {
        await navigator.clipboard.writeText(command);
        button.textContent = 'コピー済み';
        setTimeout(() => { button.textContent = 'コピー'; }, 1200);
      } catch {
        button.textContent = 'コピー失敗';
      }
    });
  });
}

function renderNotFound() {
  document.title = '見つかりません — Techniques';
  app.innerHTML = `
    <section class="article">
      <a class="back" href="#/">← Library</a>
      <div class="empty">そのTechniqueは見つからへんかった。</div>
    </section>
  `;
}

function route() {
  const path = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (!path) {
    renderHome();
    return;
  }

  const item = techniques.find(entry => entry.id === path);
  item ? renderArticle(item) : renderNotFound();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

async function init() {
  try {
    const response = await fetch('data/techniques.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    techniques = await response.json();
    techniques.sort((a, b) => String(b.updated).localeCompare(String(a.updated)) || String(b.number || '').localeCompare(String(a.number || '')));
    if (techniqueCount) techniqueCount.textContent = `${techniques.length} ITEMS`;
    route();
  } catch (error) {
    console.error(error);
    app.innerHTML = '<div class="empty">データを読み込めへんかった。ページを再読み込みしてみて。</div>';
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    if ((location.hash || '#/') !== '#/') location.hash = '#/';
    requestAnimationFrame(() => document.querySelector('#search')?.focus());
    event.preventDefault();
  }
  if (event.key === 'Escape' && location.hash && location.hash !== '#/') {
    location.hash = '#/';
  }
});

init();
