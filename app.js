const app = document.querySelector('#app');
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
    year: 'numeric', month: 'short', day: 'numeric'
  }).format(date);
}

function searchableText(item) {
  const commandText = (item.commands || []).flatMap(command => [command.label, command.code, command.note]);
  const explanationText = (item.explanation || []).flatMap(row => [row.term, row.text]);
  const sourceText = (item.sources || []).flatMap(source => [source.label, source.url]);

  return normalize([
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

function renderHome() {
  document.title = 'Techniques — やり方の置き場';
  const categories = ['すべて', ...new Set(techniques.map(item => item.category))];
  const items = getFilteredItems();

  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">How-to memory</p>
      <h1>あとで思い出すための、<br>やり方の置き場。</h1>
      <p class="hero-lead">PCも、仕事も、暮らしも。「あれ、どうやるんやったっけ？」を10秒で取り戻すための小さな手順集。</p>
    </section>

    <section aria-label="Techniquesを検索">
      <div class="search-wrap">
        <input
          id="search"
          class="search-box"
          type="search"
          autocomplete="off"
          placeholder="何をしたい？ 例：MOV 音声"
          value="${escapeHtml(searchQuery)}"
          aria-label="やり方を検索"
        >
        <p class="search-hint">タイトル・カテゴリ・タグ・本文から検索　／ 「/」キーで検索欄へ</p>
      </div>

      <div class="filters" aria-label="カテゴリで絞り込む">
        ${categories.map(category => `
          <button class="chip ${category === activeCategory ? 'is-active' : ''}" data-category="${escapeHtml(category)}" type="button">
            ${escapeHtml(category)}
          </button>
        `).join('')}
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>${searchQuery || activeCategory !== 'すべて' ? '検索結果' : '最近追加したもの'}</h2>
        <span class="count">${items.length}件</span>
      </div>

      ${items.length ? `
        <div class="cards">
          ${items.map(item => `
            <a class="card" href="#/${encodeURIComponent(item.id)}">
              <div class="card-meta">
                <span>${escapeHtml(item.category)}</span>
                <span>·</span>
                <time datetime="${escapeHtml(item.updated)}">${escapeHtml(formatDate(item.updated))}</time>
              </div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.summary)}</p>
              <div class="tags">
                ${(item.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
              </div>
            </a>
          `).join('')}
        </div>
      ` : `
        <div class="empty">
          <strong>見つからへんかった。</strong><br>
          検索語を短くするか、カテゴリを「すべて」に戻してみて。
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

function renderArticle(item) {
  document.title = `${item.title} — Techniques`;

  app.innerHTML = `
    <article class="article">
      <a class="back" href="#/">← 一覧へ戻る</a>

      <header class="article-header">
        <p class="eyebrow">${escapeHtml(item.category)}</p>
        <h1>${escapeHtml(item.title)}</h1>
        <p class="article-meta">更新 ${escapeHtml(formatDate(item.updated))}　·　${(item.tags || []).map(escapeHtml).join(' / ')}</p>
        <p class="article-summary">${escapeHtml(item.summary)}</p>
      </header>

      <section class="answer-box">
        <strong>まず結論</strong>
        <div>${escapeHtml(item.quickAnswer)}</div>
      </section>

      ${item.commands?.length ? `
        <section class="article-section">
          <h2>コピペ用</h2>
          ${item.commands.map(renderCommand).join('')}
        </section>
      ` : ''}

      ${item.steps?.length ? `
        <section class="article-section">
          <h2>手順</h2>
          <ol>
            ${item.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
          </ol>
        </section>
      ` : ''}

      ${item.explanation?.length ? `
        <section class="article-section">
          <h2>何を指定している？</h2>
          <ul>
            ${item.explanation.map(row => `<li><code>${escapeHtml(row.term)}</code> — ${escapeHtml(row.text)}</li>`).join('')}
          </ul>
        </section>
      ` : ''}

      ${item.tips?.length ? `
        <section class="article-section">
          <h2>補足</h2>
          <ul>
            ${item.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}
          </ul>
        </section>
      ` : ''}

      ${item.sources?.length ? `
        <section class="article-section sources">
          <h2>参考</h2>
          <ul>
            ${item.sources.map(source => `
              <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a></li>
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
      <a class="back" href="#/">← 一覧へ戻る</a>
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
    techniques.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
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
