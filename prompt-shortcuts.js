(() => {
  const FILE = 'data/prompt-shortcuts.json';
  const ROOT = '#/prompt-transforms/shortcuts';
  let entries = null;
  let request = null;
  let query = '';
  let filter = '';
  let categoryFilter = 'すべて';
  let favoritesOnly = false;
  const FAVORITES_KEY = 'techniques:shortcut-favorites';
  function getStoredFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      return new Set(Array.isArray(stored) ? stored.filter(key => typeof key === 'string') : []);
    } catch { return new Set(); }
  }
  let favorites = getStoredFavorites();
  let scrollY = 0;
  const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const norm = value => String(value ?? '').normalize('NFKC').toLowerCase();
  const $ = selector => document.querySelector(selector);
  const pageActive = () => location.hash.replace(/^#\/?/, '').startsWith('prompt-transforms/shortcuts');
  const aliasUrl = item => ROOT + '/' + encodeURIComponent(item.key);
  const words = input => [...new Set(String(input).split(/[\s、，,+＋;/／]+/).map(s => s.trim()).filter(Boolean))];

  async function load() {
    if (entries) return entries;
    if (!request) request = fetch(FILE, {cache:'no-store'}).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(rows => {
      if (!Array.isArray(rows) || rows.some(r => !r.key || !r.title || !['prompt','link'].includes(r.kind) || (r.kind === 'prompt' && !r.content) || (r.kind === 'link' && !r.url))) throw new Error('Invalid shortcut data');
      if (new Set(rows.map(r => r.key)).size !== rows.length) throw new Error('Duplicate shortcut aliases');
      entries = rows;
      return rows;
    }).catch(e => {request = null; throw e;});
    return request;
  }

  function lookup(key) {return entries.find(row => row.key === key);}
  function selection() {
    const keys = words(query);
    return {keys, items:keys.map(lookup).filter(Boolean), unknown:keys.filter(key=>!lookup(key))};
  }
  function composed(items) {
    const prompts = items.filter(x => x.kind === 'prompt');
    if (!prompts.length) return '';
    if (prompts.length === 1) return prompts[0].content;
    return prompts.map(x => '【' + x.key + '】\n' + x.content).join('\n\n――――――\n\n');
  }
  function warningMessages(items,unknown) {
    const keys = new Set(items.map(x=>x.key));
    const output = [];
    if (keys.has('ぜろべす') && keys.has('ぶんよく')) output.push('「ぜろべす」は前提の見直し、「ぶんよく」は原文の意味を変えない編集。併用する場合は、守るべき原文の範囲を明示して。');
    if (keys.has('ぶんよく') && keys.has('おもこふう')) output.push('「ぶんよく」は新事実の追加禁止、「おもこふう」は調査で新しい材料を探す方針。校正と新規執筆を分けると扱いやすい。');
    if (keys.has('ぶごたい') && keys.has('じょく')) output.push('格調ある文章語とジョークの両立には、どこを軽くするかの指定があると安定する。');
    if (unknown.length) output.push('未登録の合言葉：' + unknown.join('、') + '（コピーする文章には含めない）');
    const links = items.filter(x=>x.kind === 'link');
    if (links.length) output.push('リンク用の合言葉（' + links.map(x=>x.key).join('、') + '）は連結プロンプトへ含めない。下の「開く」から移動できる。');
    return output;
  }
  function selectedTags(items) {
    if (!items.length) return '<span class="ps-empty-note">合言葉を入力するか、下の一覧から追加してみて。</span>';
    return items.map(i => i.kind === 'link'
      ? '<a class="ps-selection-chip ps-link-chip" href="' + esc(i.url) + '" target="_blank" rel="noopener noreferrer">' + esc(i.key) + ' ↗</a>'
      : '<span class="ps-selection-chip">' + esc(i.key) + '</span>').join('');
  }
  function previewHtml(items) {
    const txt = composed(items);
    return txt ? esc(txt) : 'ここに展開したプロンプトが表示される。';
  }
  function rowHtml(item, selected) {
    const isPicked = selected.includes(item.key);
    const link = item.kind === 'link';
    return '<article class="ps-row" data-ps-key="' + esc(item.key) + '">' +
      '<div class="ps-row-info"><div class="ps-meta"><span class="ps-code">' + esc(item.key) + '</span><span>' + esc(item.category) + '</span>' +
      (link ? '<span>LINK</span>' : '<span>PROMPT</span>') + '</div>' +
      '<h3>' + esc(item.title) + '</h3><p>' + esc(item.summary) + '</p></div>' +
      '<div class="ps-row-buttons">' +
      '<button type="button" class="ps-favorite' + (favorites.has(item.key) ? ' is-favorite' : '') + '" data-ps-favorite="' + esc(item.key) + '" aria-pressed="' + favorites.has(item.key) + '" aria-label="' + esc(item.key) + (favorites.has(item.key) ? 'をお気に入りから解除' : 'をお気に入りに登録') + '" title="お気に入り">' + (favorites.has(item.key) ? '★' : '☆') + '</button>' +
      (link ? '<a class="ps-row-utility" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">開く ↗</a>' :
        '<button type="button" class="ps-row-utility" data-ps-copy="' + esc(item.key) + '">コピー</button>' +
        '<button type="button" class="ps-add' + (isPicked ? ' is-added' : '') + '" data-ps-add="' + esc(item.key) + '" aria-pressed="' + isPicked + '">' + (isPicked ? '選択中 ✓' : '＋ 追加') + '</button>') +
      '<a class="ps-row-detail" href="' + aliasUrl(item) + '" aria-label="' + esc(item.key) + 'の詳細">詳細 ↗</a></div></article>';
  }
  function filteredRows() {
    const tokens = norm(filter).split(/\s+/).filter(Boolean);
    return entries.filter(item => {
      if (categoryFilter !== 'すべて' && item.category !== categoryFilter) return false;
      if (favoritesOnly && !favorites.has(item.key)) return false;
      const target = norm([item.key,item.title,item.summary,item.category,item.kind === 'prompt' ? item.content : ''].join(' '));
      return tokens.every(t => target.includes(t));
    }).sort((a,b) => Number(favorites.has(b.key)) - Number(favorites.has(a.key)) || b.order - a.order);
  }
  function refreshRows() {
    const host = $('#psRows');
    if (!host) return;
    host.innerHTML = filteredRows().map(item => rowHtml(item, words(query))).join('') || '<p class="ps-empty">一致する合言葉がない。</p>';
    const count = $('#psResultsCount');
    if (count) count.textContent = filteredRows().length + ' / ' + entries.length; 
    const favButton=$('#psFavoritesOnly');
    if (favButton) {
      favButton.setAttribute('aria-pressed', String(favoritesOnly));
      favButton.classList.toggle('is-active', favoritesOnly);
      favButton.textContent = (favoritesOnly ? '★ お気に入りのみ' : '☆ お気に入り') + ' (' + entries.filter(x=>favorites.has(x.key)).length + ')';
    }
  }
  function updateComposer() {
    const {items,unknown} = selection();
    const status = $('#psSelection');
    if(status) status.innerHTML = selectedTags(items);
    const preview = $('#psPreview');
    if(preview) preview.textContent = composed(items) || 'ここに展開したプロンプトが表示される。';
    const button = $('#psCopyAll');
    if(button) {
      button.disabled = !composed(items);
      button.textContent = composed(items) ? '展開したプロンプトをコピー ↗' : '合言葉を選ぶ';
    }
    const notes = warningMessages(items,unknown);
    const warnings = $('#psWarnings');
    if (warnings) {
      warnings.hidden = !notes.length;
      warnings.innerHTML = notes.map(note => '<p>' + esc(note) + '</p>').join('');
    }
    const count = $('#psSelectedCount');
    if(count) count.textContent = items.filter(i=>i.kind==='prompt').length + '件のプロンプト';
    document.querySelectorAll('[data-ps-add]').forEach(b=>{
      const yes = words(query).includes(b.dataset.psAdd);
      b.classList.toggle('is-added', yes);
      b.setAttribute('aria-pressed',String(yes));
      b.textContent = yes ? '選択中 ✓' : '＋ 追加';
    });
  }
  function toggleFavorite(key) {
    if (!lookup(key)) return;
    if (favorites.has(key)) favorites.delete(key);
    else favorites.add(key);
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); } catch {}
    refreshRows();
    announce(key + (favorites.has(key) ? 'をお気に入りに登録しました。' : 'をお気に入りから外しました。'));
  }
  function addOrRemove(key) {
    const tokens = words(query);
    const next = tokens.includes(key) ? tokens.filter(x=>x!==key) : [...tokens,key];
    query = next.join(' ');
    const input = $('#psComposer');
    if(input) input.value = query;
    updateComposer();
  }
  function announce(message) { const status = $('#siteStatus'); if(status) status.textContent = message; }
  async function copyText(value, button, label) {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const node = document.createElement('textarea');
        node.value = value;
        node.style.cssText='position:fixed;opacity:0';
        document.body.append(node);
        node.select();
        const ok = document.execCommand('copy');
        node.remove();
        if (!ok) throw new Error('Clipboard not available');
      }
      const previous=button.textContent;
      button.textContent='コピー完了 ✓';
      announce(label+'をコピーしました。');
      setTimeout(()=>{ if(button.isConnected) button.textContent=previous; },1400);
    } catch (e) {
      announce('コピーできませんでした。下の全文を選択してコピーしてください。');
      const text=$('#psPreview') || $('#psFullText');
      if(text){const range=document.createRange();range.selectNodeContents(text);window.getSelection()?.removeAllRanges();window.getSelection()?.addRange(range);}
      button.textContent='コピー失敗';
    }
  }
  function renderList() {
    document.title = '合言葉辞書 — Techniques';
    $('#app').innerHTML = '<section class="pt-page ps-page" aria-labelledby="psTitle">' +
      '<div class="pt-topline"><a class="pt-back" href="#/prompt-transforms">← Prompt Transform</a><span>FIELD TOOL / SHORTCUTS</span></div>' +
      '<header class="ps-hero"><p class="pt-eyebrow">PERSONAL SHORTCUTS / 合言葉辞書</p><h1 id="psTitle" tabindex="-1">ひと言で、<br>いつもの長文へ。</h1>' +
      '<p class="pt-lead">略語を覚えておけば、長い指示を何度も打たずに済む。入力した合言葉をそのまま展開し、必要なら複数を組み合わせてコピーできる。</p>' +
      '<nav class="ps-nav" aria-label="特設ツール切り替え"><a href="#/prompt-transforms">変換パターン</a><span aria-current="page">合言葉辞書</span></nav></header>' +
      '<section class="ps-work" aria-labelledby="psWorkbench"><div class="ps-work-head"><span class="pt-eyebrow">QUICK EXPAND</span><h2 id="psWorkbench">合言葉を入力して展開</h2></div>' +
      '<label class="ps-label" for="psComposer">合言葉（スペース・読点・＋で複数指定）</label>' +
      '<input id="psComposer" type="text" placeholder="例：りさりさ せい" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(query) + '">' +
      '<div class="ps-examples"><span>組み合わせ例</span><button type="button" data-ps-example="りさりさ せい">調査の質を上げる</button><button type="button" data-ps-example="おもこふう はいよ">記事を深める</button><button type="button" data-ps-example="ぶんよく ぶごたい">文章を整える</button></div>' +
      '<div class="ps-selection" id="psSelection" aria-live="polite"></div>' +
      '<div id="psWarnings" class="ps-warnings" role="status" hidden></div>' +
      '<div class="ps-output-head"><strong>展開結果</strong><small id="psSelectedCount"></small></div>' +
      '<pre id="psPreview" tabindex="0" class="ps-preview"></pre>' +
      '<div class="ps-compose-actions"><button id="psCopyAll" class="pt-primary" type="button">展開したプロンプトをコピー ↗</button><button id="psClear" class="pt-secondary" type="button">クリア</button></div></section>' +
      '<section class="ps-index" aria-labelledby="psIndexTitle"><div class="ps-index-head"><h2 id="psIndexTitle">合言葉一覧</h2><span id="psResultsCount"></span></div>' +
      '<input id="psFilter" type="search" autocomplete="off" placeholder="合言葉・使いどころ・文章内の語句で検索" aria-label="合言葉を検索" value="' + esc(filter) + '">' +
      '<div class="ps-filters"><label for="psCategory">分類</label><select id="psCategory" aria-label="分類で絞り込む">' + ['すべて',...new Set(entries.map(x=>x.category))].map(cat => '<option value="' + esc(cat) + '"' + (categoryFilter===cat?' selected':'') + '>' + esc(cat) + '</option>').join('') + '</select><button type="button" id="psFavoritesOnly" aria-pressed="' + favoritesOnly + '">☆ お気に入り</button><small>★は次回のために保存。新しい項目から表示</small></div>' +
      '<div id="psRows" class="ps-rows"></div></section>' +
      '<div class="ps-footnote"><p>原文を改変せず収録。単独コピーは原文そのまま、複数指定は合言葉ごとに区切って連結する。リンク用の2件は開く操作に対応。衝突しそうな指示は警告のみで、勝手に削除・統合しない。</p><p>このページはブラウザ内で文字列を組み立てる。AIへの送信やバックグラウンドの実行はしない。</p></div></section>';
    const composer=$('#psComposer');
    composer.addEventListener('input', e=>{query=e.target.value;updateComposer();});
    $('#psFilter').addEventListener('input', e=>{filter=e.target.value;refreshRows();});
    $('#psCategory').addEventListener('change', e=>{categoryFilter=e.target.value;refreshRows();});
    $('#psFavoritesOnly').addEventListener('click', ()=>{favoritesOnly=!favoritesOnly;refreshRows();});
    $('#psClear').addEventListener('click',()=>{query='';composer.value='';updateComposer();composer.focus();});
    $('#psCopyAll').addEventListener('click',e=>copyText(composed(selection().items),e.currentTarget,'展開したプロンプト'));
    document.querySelectorAll('[data-ps-example]').forEach(button=>button.addEventListener('click',()=>{
      query=button.dataset.psExample;
      composer.value=query;
      updateComposer();
    }));
    $('#psRows').addEventListener('click',e=>{
      const fav=e.target.closest('[data-ps-favorite]');
      if(fav){toggleFavorite(fav.dataset.psFavorite);return;}
      const add=e.target.closest('[data-ps-add]');
      if(add){addOrRemove(add.dataset.psAdd);return;}
      const copy=e.target.closest('[data-ps-copy]');
      if(copy){const item=lookup(copy.dataset.psCopy);if(item)copyText(item.content,copy,'合言葉「'+item.key+'」');return;}
      const link=e.target.closest('a[href^="#/prompt-transforms/shortcuts/"]');
      if(link)scrollY=window.scrollY;
    });
    refreshRows();
    updateComposer();
    requestAnimationFrame(()=>window.scrollTo({top:scrollY,behavior:'instant'}));
  }
  function renderDetail(item) {
    document.title=item.key+' — 合言葉辞書';
    const link=item.kind==='link';
    $('#app').innerHTML = '<article class="pt-page ps-page ps-detail" aria-labelledby="psDetailTitle">' +
      '<div class="pt-topline"><a class="pt-back" href="'+ROOT+'">← 合言葉一覧へ</a><span>'+esc(item.category)+' / '+(link?'LINK':'PROMPT')+'</span></div>' +
      '<header class="ps-detail-head"><p class="pt-eyebrow">SHORTCUT / '+esc(item.key)+'</p><h1 id="psDetailTitle" tabindex="-1">'+esc(item.title)+'</h1><p>'+esc(item.summary)+'</p></header>' +
      '<section class="ps-detail-body"><div class="ps-output-head"><strong>登録内容（原文）</strong><small>'+esc(item.key)+'</small></div><pre class="ps-preview" id="psFullText" tabindex="0">'+esc(link?item.url:item.content)+'</pre>' +
      '<div class="ps-compose-actions">' + (link?'<a class="pt-primary ps-external" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">サイトを開く ↗</a>':'<button id="psCopySingle" class="pt-primary" type="button">原文をコピー ↗</button>') +
      '<button id="psCopyDetailLink" class="pt-secondary" type="button">この項目のURLをコピー</button></div></section>' +
      '<p class="ps-footnote">登録内容は入力された原文を保存。意味や文体を整える変換は自動で加えていない。</p></article>';
    $('#psCopySingle')?.addEventListener('click',e=>copyText(item.content,e.currentTarget,'原文'));
    $('#psCopyDetailLink').addEventListener('click',e=>copyText(location.href,e.currentTarget,'この項目のURL'));
    requestAnimationFrame(()=>{window.scrollTo({top:0,behavior:'instant'});});
  }
  async function render(id='') {
    const root=$('#app');
    root.innerHTML='<div class="pt-loading" role="status">合言葉辞書を読み込み中…</div>';
    try {
      await load();
      if(!pageActive())return;
      const key=decodeURIComponent(location.hash.split('/').slice(3).join('/'));
      if(key !== id)return;
      if(!id)renderList();
      else {
        const entry=lookup(id);
        if(entry)renderDetail(entry);
        else root.innerHTML='<div class="pt-page pt-empty"><a href="'+ROOT+'">← 一覧へ戻る</a><p>その合言葉は登録されていない。</p></div>';
      }
    } catch(e) {
      console.error(e);
      if(pageActive())root.innerHTML='<div class="pt-page pt-empty"><p>合言葉辞書を読み込めませんでした。</p><button type="button" id="psRetry">再試行</button></div>';
      $('#psRetry')?.addEventListener('click',()=>render(id));
    }
  }
  function onSlash(event) {
    event.preventDefault();
    if (location.hash !== ROOT) location.hash=ROOT;
    else $('#psComposer')?.focus();
    return true;
  }
  function onEscape(event) {
    event.preventDefault();
    location.hash=(location.hash===ROOT?'#/prompt-transforms':ROOT);
    return true;
  }
  window.PromptShortcuts={render,onSlash,onEscape};
})();
