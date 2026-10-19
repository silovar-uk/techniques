(() => {
  const ROOT = 'prompt-transforms';
  const DATA_URL = 'data/prompt-transforms.json';
  const GROUPS = ['すべて', '調査', '思考', '制作', '文章', '仕事', '検証'];
  let items = null;
  let pending = null;
  let search = '';
  let group = 'すべて';
  let listScroll = 0;
  let lastItem = '';
  const drafts = new Map();
  const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase();
  const renderTemplate = (item, values = item.defaults) => item.template.replace(/\{\{([^{}]+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
  const pathFor = id => `#/${ROOT}/${encodeURIComponent(id)}`;
  const target = () => document.querySelector('#app');
  const active = () => location.hash.replace(/^#\/?/, '').startsWith(ROOT);

  async function getItems() {
    if (items) return items;
    if (!pending) {
      pending = fetch(DATA_URL, { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }).then(data => {
        if (!Array.isArray(data) || data.some(item => !item.id || !item.title || !item.template || !item.defaults || !GROUPS.includes(item.group))) {
          throw new Error('Invalid prompt transformation data');
        }
        const ids = data.map(item => item.id);
        if (new Set(ids).size !== ids.length) throw new Error('Duplicate prompt transformation IDs');
        items = data;
        return items;
      }).catch(error => {
        pending = null;
        throw error;
      });
    }
    return pending;
  }

  function renderListRows(rows) {
    if (!rows.length) return '<p class="pt-empty">該当する変換がない。検索語を短くするか、分類を「すべて」に戻してみて。</p>';
    return rows.map(item => `
      <div class="pt-row" data-transform-id="${escape(item.id)}">
        <a class="pt-row-link" href="${pathFor(item.id)}" aria-label="${escape(item.title)}を開く">
          <span class="pt-row-group">${escape(item.group)} <span aria-hidden="true">/</span> ${String(item.order).padStart(2, '0')}</span>
          <strong>${escape(item.title)}</strong>
          <span class="pt-row-before"><s>${escape(item.before)}</s></span>
          <span class="pt-row-principle">${escape(item.principle)}</span>
        </a>
        <div class="pt-row-action">
          <button type="button" class="pt-copy-list" data-pt-copy="${escape(item.id)}" aria-label="${escape(item.title)}の改善後プロンプトをコピー">COPY</button>
          <a href="${pathFor(item.id)}" aria-label="変換の詳細を見る" class="pt-row-arrow">↗</a>
        </div>
      </div>`).join('');
  }

  function filtered() {
    const words = normalize(search.trim()).split(/\s+/).filter(Boolean);
    return items.filter(item => {
      if (group !== 'すべて' && item.group !== group) return false;
      const haystack = normalize([item.title, item.before, item.principle, item.group, ...(item.tags || [])].join(' '));
      return words.every(word => haystack.includes(word));
    });
  }

  function updateResults() {
    const host = document.querySelector('#ptResults');
    if (!host) return;
    const rows = filtered();
    host.innerHTML = renderListRows(rows);
    const status = document.querySelector('#ptCount');
    if (status) status.textContent = `${rows.length} / ${items.length} PATTERNS`;
    document.querySelectorAll('[data-pt-group]').forEach(button => {
      const selected = button.dataset.ptGroup === group;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function restoreListContext() {
    requestAnimationFrame(() => {
      window.scrollTo({ top: listScroll, behavior: 'instant' });
      const previouslySelected = lastItem && document.querySelector(`.pt-row[data-transform-id="${CSS.escape(lastItem)}"] .pt-row-link`);
      if (previouslySelected && document.documentElement.dataset.ptKeyboard === 'true') previouslySelected.focus({ preventScroll: true });
      document.documentElement.dataset.ptKeyboard = '';
    });
  }

  function renderList() {
    document.title = 'プロンプト変換 — Techniques';
    const root = target();
    root.innerHTML = `
      <section class="pt-page pt-library" aria-labelledby="ptTitle">
        <div class="pt-topline"><a href="#/" class="pt-back">← Techniques</a><span>FIELD TOOL / 01</span></div>
        <header class="pt-hero">
          <p class="pt-eyebrow">PROMPT TRANSFORM / 変換の標本集</p>
          <h1 id="ptTitle" tabindex="-1">あいまいな依頼を、<br>使える指示に。</h1>
          <p class="pt-lead">目的から選ぶ。変換前後を見る。自分の条件に直してコピーする。<br>長いプロンプトを暗記する必要はない。</p>
          <div class="pt-path" aria-label="3つの使い方"><span><b>守</b> 比べる</span><span aria-hidden="true">→</span><span><b>破</b> 差し替える</span><span aria-hidden="true">→</span><span><b>離</b> 原理を使う</span></div>
          <nav class="ps-nav" aria-label="特設ツール切り替え"><span aria-current="page">変換パターン</span><a href="#/prompt-transforms/shortcuts">合言葉辞書 <b>60</b> ↗</a></nav>
        </header>
        <div class="pt-controls" role="search">
          <label for="ptSearch">何を良くしたい？</label>
          <div class="pt-search-wrap"><span aria-hidden="true">⌕</span><input id="ptSearch" type="search" placeholder="例：一次情報 / UI / PPT / ニーズ" autocomplete="off" value="${escape(search)}" aria-controls="ptResults"></div>
          <div class="pt-groups" aria-label="変換の分類">
            ${GROUPS.map(name => `<button type="button" class="pt-group${group === name ? ' is-active' : ''}" data-pt-group="${escape(name)}" aria-pressed="${group === name}">${escape(name)}</button>`).join('')}
          </div>
        </div>
        <div class="pt-list-heading"><h2>変換パターン</h2><span id="ptCount" aria-live="polite">${items.length} PATTERNS</span></div>
        <div id="ptResults" class="pt-results">${renderListRows(filtered())}</div>
        <section class="pt-about" aria-label="この一覧の考え方">
          <strong>なぜ、変換前も載せるのか。</strong>
          <p>完成した長文だけでは使いどころを思い出しにくい。元の一言と改善の原理を並べ、似た仕事へ転用しやすくした。テンプレートは正解ではなく、試して調整するための出発点。</p>
          <p><a href="https://help.openai.com/en/articles/10032626" target="_blank" rel="noopener noreferrer">プロンプト設計の基本 ↗</a> <a href="https://www.nngroup.com/articles/ten-usability-heuristics/" target="_blank" rel="noopener noreferrer">UXの基本原則 ↗</a></p>
        </section>
      </section>`;
    document.querySelector('#ptSearch')?.addEventListener('input', e => { search = e.target.value; updateResults(); });
    document.querySelectorAll('[data-pt-group]').forEach(button => button.addEventListener('click', () => {
      group = button.dataset.ptGroup;
      updateResults();
    }));
    root.querySelector('#ptResults')?.addEventListener('click', async e => {
      const copy = e.target.closest('[data-pt-copy]');
      if (copy) {
        const item = items.find(row => row.id === copy.dataset.ptCopy);
        if (item) await copyText(renderTemplate(item), copy, '改善後プロンプト');
        return;
      }
      const link = e.target.closest('a[href^="#/prompt-transforms/"]');
      if (link) {
        listScroll = window.scrollY;
        lastItem = link.closest('[data-transform-id]')?.dataset.transformId || '';
        document.documentElement.dataset.ptKeyboard = e.detail === 0 ? 'true' : 'false';
      }
    });
    restoreListContext();
  }

  async function copyText(value, button, label) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.append(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        if (!ok) throw new Error('Copy unavailable');
      }
      const old = button.textContent;
      button.textContent = 'COPIED ✓';
      button.classList.add('is-copied');
      announce(`${label}をコピーしました。`);
      setTimeout(() => {
        if (button.isConnected) { button.textContent = old; button.classList.remove('is-copied'); }
      }, 1400);
    } catch (error) {
      announce('コピーできませんでした。テキストを選択してコピーしてください。');
      const text = document.querySelector('#ptGenerated');
      if (text) {
        const range = document.createRange();
        range.selectNodeContents(text);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      button.textContent = 'COPY FAILED';
    }
  }

  function announce(value) {
    const status = document.querySelector('#siteStatus');
    if (status) status.textContent = value;
  }

  function renderDetail(item) {
    const root = target();
    document.title = `${item.title} — プロンプト変換`;
    const values = drafts.get(item.id) || { ...item.defaults };
    const fields = Object.entries(item.defaults);
    const index = items.findIndex(row => row.id === item.id);
    const next = items[(index + 1) % items.length];
    root.innerHTML = `
      <article class="pt-page pt-detail" aria-labelledby="ptDetailTitle">
        <div class="pt-topline"><a href="#/${ROOT}" class="pt-back">← 変換一覧に戻る</a><span>${escape(item.group)} / ${String(item.order).padStart(2, '0')}</span></div>
        <header class="pt-detail-head">
          <p class="pt-eyebrow">PROMPT TRANSFORM / ${escape(item.group)}</p>
          <h1 id="ptDetailTitle" tabindex="-1">${escape(item.title)}</h1>
          <p>${escape(item.principle)}</p>
        </header>
        <section class="pt-stage" aria-labelledby="ptSeeTitle">
          <div class="pt-stage-title"><span>01 / 守</span><h2 id="ptSeeTitle">変換前と比べる</h2></div>
          <div class="pt-comparison">
            <div class="pt-before"><span class="pt-kicker">BEFORE / ありがちな依頼</span><p>${escape(item.before)}</p></div>
            <div class="pt-after"><span class="pt-kicker">AFTER / 何を変えるか</span><p>${escape(item.principle)}</p></div>
          </div>
        </section>
        <section class="pt-stage" aria-labelledby="ptMakeTitle">
          <div class="pt-stage-title"><span>02 / 破</span><h2 id="ptMakeTitle">自分の仕事に合わせる</h2></div>
          <p class="pt-hint">下の項目を書き換えると、完成版に即座に反映される。編集内容はこのタブを閉じるまで保持。</p>
          <div class="pt-variables">
            ${fields.map(([key, val]) => `<label class="pt-var"><span>${escape(key)}</span>${String(val).length > 75 ? `<textarea rows="3" data-pt-field="${escape(key)}">${escape(values[key])}</textarea>` : `<input type="text" data-pt-field="${escape(key)}" value="${escape(values[key])}" autocomplete="off">`}</label>`).join('')}
          </div>
          <div class="pt-output-head"><span>READY TO USE / 完成版</span><button type="button" class="pt-reset" id="ptReset">入力を初期化</button></div>
          <div class="pt-output"><pre id="ptGenerated" tabindex="0">${escape(renderTemplate(item, values))}</pre></div>
          <div class="pt-actions"><button id="ptCopyPrompt" class="pt-primary" type="button">完成版をコピー ↗</button><button id="ptCopyLink" class="pt-secondary" type="button">この変換のURLをコピー</button></div>
        </section>
        <section class="pt-stage pt-distill" aria-labelledby="ptRuleTitle">
          <div class="pt-stage-title"><span>03 / 離</span><h2 id="ptRuleTitle">型を覚えず、原理を持ち帰る</h2></div>
          <div class="pt-rule"><p>${escape(item.principle)}</p><button type="button" id="ptCopyRule">原理をコピー</button></div>
          <p class="pt-avoid"><b>避けたいこと：</b>${escape(item.avoid)}</p>
        </section>
        <div class="pt-next"><a href="${pathFor(next.id)}">NEXT PATTERN <span>${escape(next.title)} →</span></a></div>
      </article>`;
    const output = root.querySelector('#ptGenerated');
    const fieldsHost = root.querySelector('.pt-variables');
    const update = () => {
      const current = Object.fromEntries([...fieldsHost.querySelectorAll('[data-pt-field]')].map(field => [field.dataset.ptField, field.value]));
      drafts.set(item.id, current);
      output.textContent = renderTemplate(item, current);
    };
    fieldsHost.addEventListener('input', update);
    root.querySelector('#ptReset').addEventListener('click', () => {
      fieldsHost.querySelectorAll('[data-pt-field]').forEach(field => { field.value = item.defaults[field.dataset.ptField] ?? ''; });
      update();
      fieldsHost.querySelector('[data-pt-field]')?.focus();
    });
    root.querySelector('#ptCopyPrompt').addEventListener('click', e => copyText(output.textContent, e.currentTarget, '完成版プロンプト'));
    root.querySelector('#ptCopyRule').addEventListener('click', e => copyText(item.principle, e.currentTarget, '改善原理'));
    root.querySelector('#ptCopyLink').addEventListener('click', e => copyText(location.href, e.currentTarget, 'URL'));
    root.querySelector('.pt-next a')?.addEventListener('click', () => { listScroll = 0; });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (document.documentElement.dataset.ptKeyboard === 'true') root.querySelector('#ptDetailTitle')?.focus({ preventScroll: true });
    });
  }

  async function render(id = '') {
    if (id === 'shortcuts' || id.startsWith('shortcuts/')) {
      return window.PromptShortcuts?.render(id === 'shortcuts' ? '' : id.slice('shortcuts/'.length));
    }
    const root = target();
    root.innerHTML = '<div class="pt-loading" role="status">変換一覧を読み込み中…</div>';
    try {
      await getItems();
      if (!active()) return;
      const current = decodeURIComponent(location.hash.replace(/^#\/?/, '').split('/')[1] || '');
      if (current !== id) return;
      if (id) {
        const item = items.find(row => row.id === id);
        if (item) renderDetail(item);
        else root.innerHTML = `<div class="pt-page pt-empty"><a href="#/${ROOT}">← 一覧に戻る</a><p>その変換は見つかりませんでした。</p></div>`;
      } else renderList();
    } catch (error) {
      console.error(error);
      if (active()) root.innerHTML = `<div class="pt-page pt-empty"><p>変換一覧を読み込めませんでした。</p><button id="ptRetry">再試行</button></div>`;
      root.querySelector('#ptRetry')?.addEventListener('click', () => render(id));
    }
  }

  function isActive() { return active(); }
  function onSlash(event) {
    if (!active()) return false;
    if (location.hash.replace(/^#\/?/, '').startsWith('prompt-transforms/shortcuts')) return window.PromptShortcuts?.onSlash(event) || false;
    if (location.hash === `#/${ROOT}`) {
      event.preventDefault();
      document.querySelector('#ptSearch')?.focus();
    } else {
      event.preventDefault();
      location.hash = `#/${ROOT}`;
    }
    return true;
  }
  function onEscape(event) {
    if (!active()) return false;
    if (location.hash.replace(/^#\/?/, '').startsWith('prompt-transforms/shortcuts')) return window.PromptShortcuts?.onEscape(event) || false;
    if (location.hash !== `#/${ROOT}`) {
      event.preventDefault();
      location.hash = `#/${ROOT}`;
    } else {
      event.preventDefault();
      location.hash = '#/';
    }
    return true;
  }
  window.PromptTransforms = { render, isActive, onSlash, onEscape };
})();
