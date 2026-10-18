(() => {
  'use strict';
  const DATA_URL = 'data/prompt-shortcuts.json';
  const ROOT = '#/prompt-transforms/shortcuts';
  const INTENTS = ['すべて','調べる','考える','書く','作る','学ぶ','整理する','進める','リンク'];
  const ROLES = ['すべて','主指示','視点追加','品質強化','表現調整','出力指定','進行指定','リンク'];
  const FAVORITES_KEY = 'techniques:shortcut-favorites';
  const RECIPES = [
    {label:'調査を深く',description:'調査 → 品質検証 → 別の裏付け',keys:['りさりさ','せい','どうべつ']},
    {label:'発想をひっくり返す',description:'前提を外す → 違う分野 → 失敗検証',keys:['ぜろべす','ちがぶん','あくべん']},
    {label:'記事を立体化する',description:'面白い調査 → 構成 → 視覚化',keys:['おもこふう','はいよ','びじゅさし']},
    {label:'UIを仕様にする',description:'体験設計 → 設計監査 → 実装仕様',keys:['しゅはれ','せい','こでしよ']}
  ];
  const html = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
  const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase();
  const $ = selector => document.querySelector(selector);
  const byKey = key => state.items.find(item => item.key === key);
  const currentPath = () => decodeURIComponent(location.hash.replace(/^#\/?/, '').split('/').slice(2).join('/')) .replace(/^shortcuts(?:\/|$)/, '');
  const detailUrl = key => ROOT + '/' + encodeURIComponent(key);
  const isActive = () => location.hash.replace(/^#\/?/, '').startsWith('prompt-transforms/shortcuts');
  const terms = query => normalize(query.trim()).split(/\s+/).filter(Boolean);
  const aliases = query => [...new Set(String(query).split(/[\s、，,+＋;/／]+/).map(key => key.trim()).filter(Boolean))];
  const storage = () => {try {const rows = JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');return new Set(Array.isArray(rows)?rows.filter(x=>typeof x==='string'):[]);}catch{return new Set();}};
  const state = {items:[],promise:null,search:'',intent:'すべて',role:'すべて',favoritesOnly:false,
    favorites:storage(),selected:[],listLimit:14,listScroll:0,moreFilters:false,showFull:false,returnFocus:null};

  function announce(text) {const status=$('#siteStatus');if(status) status.textContent=text;}
  async function load() {
    if(state.items.length) return state.items;
    if(!state.promise) state.promise=fetch(DATA_URL,{cache:'no-store'})
      .then(response=>{if(!response.ok)throw new Error('HTTP '+response.status);return response.json();})
      .then(rows=>{
        if(!Array.isArray(rows)||!rows.length||rows.some(r=>!r.key||!r.title||!r.intent||!r.role||!['prompt','link'].includes(r.kind)))throw Error('Invalid shortcut data');
        if(new Set(rows.map(r=>r.key)).size!==rows.length)throw Error('Duplicate aliases');
        state.items=rows;return rows;
      }).catch(error=>{state.promise=null;throw error;});
    return state.promise;
  }

  function score(item, query) {
    if(!query) return 0;
    const t=terms(query);
    const bits=[item.key,item.title,item.summary,item.category,item.intent,item.role,...(item.keywords||[]),item.kind==='prompt'?item.content:''];
    const normalized=bits.map(normalize);
    if(!t.every(word=>normalized.some(value=>value.includes(word))))return -1;
    const name=normalize(item.key), title=normalize(item.title), tags=normalize([...(item.keywords||[]),item.intent,item.role].join(' '));
    let points=0;
    t.forEach(word=>{
      if(name===word)points+=110;
      else if(name.startsWith(word))points+=70;
      else if(name.includes(word))points+=50;
      if(title.includes(word))points+=35;
      if(tags.includes(word))points+=25;
      if(normalize(item.summary).includes(word))points+=12;
    });
    return points;
  }
  function results() {
    return state.items.map(item=>({item,score:score(item,state.search)})).filter(({item,score})=>
      score>=0&&(state.intent==='すべて'||item.intent===state.intent)&&
      (state.role==='すべて'||item.role===state.role)&&
      (!state.favoritesOnly||state.favorites.has(item.key))
    ).sort((a,b)=>
      (state.search.trim()?b.score-a.score:0)||
      Number(state.favorites.has(b.item.key))-Number(state.favorites.has(a.item.key))||
      b.item.order-a.item.order
    ).map(x=>x.item);
  }
  function promptItems() {return state.selected.map(byKey).filter(item=>item?.kind==='prompt');}
  function combined() {
    const selected=promptItems();
    if(!selected.length)return '';
    if(selected.length===1)return selected[0].content;
    return selected.map(item=>'【'+item.key+'｜'+item.title+'】\n'+item.content).join('\n\n――――――\n\n');
  }
  function warnings() {
    const found=new Set(state.selected),notes=[];
    if(found.has('ぜろべす')&&found.has('ぶんよく')) notes.push('ゼロベースの再考と原文を守る校正は目的が違う。編集する範囲を指定して。');
    if(found.has('ぶんよく')&&found.has('おもこふう')) notes.push('原文にない事実の追加禁止と、新しい材料の調査は別工程。');
    if(found.has('ぜんぞ')&&found.has('みつもん')) notes.push('質問数が1問と3問で衝突。どちらかを選んで。');
    if(found.has('さごあつ')&&found.has('すきゃぺあ')) notes.push('索引の出力形式が異なる。採用する形式を一つに絞って。');
    if(found.has('もくこう')&&found.has('すてばい')) notes.push('最初は目次だけ、と最後まで実行、の進行条件が競合。');
    if(found.has('たんみじ')&&found.has('がいれき')) notes.push('短い会話と丁寧な基礎説明は長さの優先順位を決めて。');
    if(found.has('じょく')&&found.has('ぶごたい')) notes.push('ジョークと格調ある文章の配分を指定すると安定する。');
    if(found.has('まずは')&&found.has('ぎゃくもん')) notes.push('この2件は実質的に同じ指示。両方を入れなくてもよい。');
    return notes;
  }

  async function copy(value,button,label) {
    if(!value)return;
    const before=button.textContent;
    try {
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const input=document.createElement('textarea');
        input.value=value;input.style.cssText='position:fixed;opacity:0;pointer-events:none';document.body.append(input);input.select();
        const ok=document.execCommand('copy');input.remove();if(!ok)throw Error('Clipboard not available');
      }
      button.textContent='コピー完了 ✓';button.classList.add('is-copied');
      announce(label+'をコピーしました。');
      setTimeout(()=>{if(button.isConnected){button.textContent=before;button.classList.remove('is-copied');}},1400);
    } catch(error) {
      button.textContent='コピー失敗';
      announce('コピーに失敗しました。全文表示から選択してコピーしてください。');
      const pre=$('#psFullText')||$('#psPreview');
      if(pre){const range=document.createRange();range.selectNodeContents(pre);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);}
    }
  }
  function setFavorite(key) {
    state.favorites.has(key)?state.favorites.delete(key):state.favorites.add(key);
    try{localStorage.setItem(FAVORITES_KEY,JSON.stringify([...state.favorites]));}catch{}
    updateResults();
    announce(key+(state.favorites.has(key)?'をお気に入りに登録しました。':'をお気に入りから外しました。'));
    const btn=$('#psResults [data-ps-favorite="'+CSS.escape(key)+'"]');
    btn?.focus({preventScroll:true});
  }
  function addKey(key) {
    const item=byKey(key);
    if(!item||item.kind!=='prompt')return;
    state.selected.includes(key)?state.selected=state.selected.filter(x=>x!==key):state.selected.push(key);
    refreshComposer();
    updateResults();
  }
  function reorder(key,delta) {
    const i=state.selected.indexOf(key),j=i+delta;
    if(i<0||j<0||j>=state.selected.length)return;
    [state.selected[i],state.selected[j]]=[state.selected[j],state.selected[i]];
    refreshComposer();
    const focus=$('#psStack [data-ps-move="'+delta+'"][data-ps-key="'+CSS.escape(key)+'"]');
    focus?.focus({preventScroll:true});
  }

  function buildRow(item) {
    const link=item.kind==='link',favorite=state.favorites.has(item.key),picked=state.selected.includes(item.key);
    return '<article class="ps-v2-row" data-ps-row="'+html(item.key)+'">'+
      '<a class="ps-v2-row-main" href="'+detailUrl(item.key)+'" aria-label="'+html(item.key)+'の原文・詳細を開く">'+
      '<span class="ps-v2-alias">'+html(item.key)+'</span>'+
      '<span class="ps-v2-row-info"><strong>'+html(item.title)+'</strong><span>'+html(item.summary)+'</span>'+
      '<small>'+html(item.intent)+' · '+html(item.role)+'</small></span></a>'+
      '<div class="ps-v2-row-actions">'+
      '<button class="ps-v2-star'+(favorite?' is-active':'')+'" type="button" data-ps-favorite="'+html(item.key)+'" aria-label="'+html(item.key)+(favorite?'のお気に入り解除':'をお気に入りへ')+'" aria-pressed="'+favorite+'">'+(favorite?'★':'☆')+'</button>'+
      (link?'<a class="ps-v2-action ps-v2-open" href="'+html(item.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+html(item.key)+'のサイトを開く">開く↗</a>':
       '<button type="button" class="ps-v2-action ps-v2-copy" data-ps-copy="'+html(item.key)+'">コピー</button>'+
       '<button type="button" class="ps-v2-action ps-v2-add'+(picked?' is-added':'')+'" data-ps-add="'+html(item.key)+'" aria-label="'+html(item.key)+(picked?'を組み合わせから外す':'を組み合わせに追加')+'" aria-pressed="'+picked+'">'+(picked?'✓':'＋')+'</button>')+
      '</div></article>';
  }
  function updateResults() {
    const host=$('#psResults');if(!host)return;
    const data=results();
    const visible=data.slice(0,state.listLimit);
    host.innerHTML=visible.length?visible.map(buildRow).join(''):
      '<div class="ps-no-results"><strong>見つからへんかった。</strong><p>合言葉を短くするか、分類を解除して探してみて。</p><button type="button" id="psResetFilters">絞り込みを解除</button></div>';
    const status=$('#psCount');if(status)status.textContent=data.length+' / '+state.items.length+'件';
    const more=$('#psMore');if(more){more.hidden=data.length<=state.listLimit;more.textContent='さらに表示（あと'+Math.min(14,data.length-state.listLimit)+'件）';}
    document.querySelectorAll('[data-ps-intent]').forEach(button=>{
      const active=button.dataset.psIntent===state.intent;
      button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
    });
    const role=$('#psRole');if(role)role.value=state.role;
    const fav=$('#psOnlyFavorites');if(fav){fav.classList.toggle('is-active',state.favoritesOnly);fav.setAttribute('aria-pressed',String(state.favoritesOnly));fav.textContent='★ お気に入り '+state.favorites.size;}
    const shortcut=$('#psAliasSuggest');
    if(shortcut){
      const parsed=aliases(state.search);
      const selected=parsed.map(byKey);
      const ready=parsed.length>1&&selected.every(item=>item?.kind==='prompt');
      shortcut.hidden=!ready;
      if(ready)shortcut.innerHTML='<span>'+parsed.map(html).join(' ＋ ')+'</span><button type="button" id="psAddAliases">この'+parsed.length+'件を組み立てる →</button>';
    }
  }
  function refreshComposer() {
    const host=$('#psStack');
    const count=state.selected.length;
    if(host){
      host.hidden=!count;
      const list=$('#psStackList');
      if(list) list.innerHTML=promptItems().map((item,index)=>
        '<div class="ps-stack-item" data-stack-key="'+html(item.key)+'">'+
        '<span class="ps-stack-order">'+String(index+1).padStart(2,'0')+'</span>'+
        '<span class="ps-stack-text"><b>'+html(item.key)+'</b><small>'+html(item.title)+'</small></span>'+
        '<div class="ps-stack-actions">'+
        '<button type="button" data-ps-move="-1" data-ps-key="'+html(item.key)+'" aria-label="'+html(item.key)+'を上に移動" '+(index===0?'disabled':'')+'>↑</button>'+
        '<button type="button" data-ps-move="1" data-ps-key="'+html(item.key)+'" aria-label="'+html(item.key)+'を下に移動" '+(index===count-1?'disabled':'')+'>↓</button>'+
        '<button type="button" data-ps-remove="'+html(item.key)+'" aria-label="'+html(item.key)+'を削除">×</button></div></div>').join('');
      const warningsHost=$('#psWarnings');
      const notes=warnings();
      if(warningsHost){warningsHost.hidden=!notes.length;warningsHost.innerHTML=notes.map(msg=>'<p>'+html(msg)+'</p>').join('');}
      const pre=$('#psPreview');if(pre)pre.textContent=combined();
      const combinedCount=$('#psTotalCount');if(combinedCount)combinedCount.textContent=count+'件 · '+combined().length+'文字';
      const preview=$('#psPreviewDisclosure');
      if(preview)preview.open=state.showFull;
    }
    const bar=$('#psBottomBar');
    if(bar){bar.hidden=!count;bar.querySelector('#psBottomCount').textContent=count+'件を選択中';}
    document.body.classList.toggle('ps-has-stack',count>0);
  }
  function showStack() {
    if(!state.selected.length)return;
    $('#psStack')?.scrollIntoView({behavior:'auto',block:'start'});
    const head=$('#psStackHeading');head?.focus({preventScroll:true});
  }

  function renderList() {
    document.title='合言葉辞書 — Techniques';
    const quick=state.items.filter(item=>state.favorites.has(item.key)).slice(0,6);
    const filters=INTENTS.map(intent=>{
      const n=intent==='すべて'?state.items.length:state.items.filter(item=>item.intent===intent).length;
      return '<button type="button" data-ps-intent="'+html(intent)+'" aria-pressed="'+(intent===state.intent)+'" class="'+(intent===state.intent?'is-active':'')+'">'+html(intent)+'<span>'+n+'</span></button>';
    }).join('');
    const roles=ROLES.map(role=>'<option value="'+html(role)+'"'+(role===state.role?' selected':'')+'>'+html(role)+'</option>').join('');
    $('#app').innerHTML=
      '<section class="pt-page ps-v2" aria-labelledby="psPageTitle">'+
      '<div class="pt-topline"><a class="pt-back" href="#/prompt-transforms">← Prompt Transform</a><span>SHORTCUTS / '+state.items.length+'</span></div>'+
      '<header class="ps-v2-hero"><p class="pt-eyebrow">PERSONAL PROMPT INDEX</p><h1 id="psPageTitle">思い出す前に、見つかる。</h1>'+
      '<p>合言葉でも、やりたいことでも。探してコピー。必要な指示だけ、つなげて使う。</p>'+
      '<nav class="ps-nav" aria-label="特設ツール切り替え"><a href="#/prompt-transforms">変換パターン</a><span aria-current="page">合言葉辞書</span></nav></header>'+
      '<section class="ps-v2-finder" aria-label="合言葉を探す">'+
      '<label for="psSearch">何をしたい？ 合言葉でも検索できる</label>'+
      '<div class="ps-v2-search"><span aria-hidden="true">⌕</span><input id="psSearch" type="search" placeholder="例：市場調査 / UI / りさりさ" autocomplete="off" value="'+html(state.search)+'" aria-controls="psResults"><kbd>/</kbd></div>'+
      '<div id="psAliasSuggest" class="ps-alias-suggest" hidden></div>'+
      '<div class="ps-v2-intents" role="group" aria-label="やりたいことから探す">'+filters+'</div>'+
      '<div class="ps-v2-advanced"><details id="psAdvanced"'+(state.moreFilters?' open':'')+'><summary>さらに絞る <small>指示の役割</small></summary>'+
      '<div class="ps-v2-advanced-body"><label for="psRole">指示の役割</label><select id="psRole">'+roles+'</select><button id="psResetAdvanced" type="button">条件をリセット</button></div></details>'+
      '<button id="psOnlyFavorites" type="button" aria-pressed="'+state.favoritesOnly+'">★ お気に入り '+state.favorites.size+'</button></div>'+
      (quick.length?'<div class="ps-v2-pins"><strong>よく使う</strong>'+quick.map(item=>'<button type="button" data-ps-quick="'+html(item.key)+'">'+html(item.key)+' <span>↗</span></button>').join('')+'</div>':'')+
      '</section>'+
      '<section id="psStack" class="ps-stack" aria-labelledby="psStackHeading" hidden>'+
      '<div class="ps-stack-top"><div><p class="pt-eyebrow">PROMPT STACK / 指示を組み立てる</p><h2 id="psStackHeading" tabindex="-1">選んだ順番に、つなげる。</h2></div><span id="psTotalCount"></span></div>'+
      '<div id="psStackList"></div>'+
      '<div id="psWarnings" class="ps-v2-warnings" role="status" hidden></div>'+
      '<details id="psPreviewDisclosure"><summary>連結した原文を確認 <span>↗</span></summary><pre id="psPreview" tabindex="0"></pre></details>'+
      '<div class="ps-stack-footer"><button id="psStackCopy" class="pt-primary" type="button">まとめてコピー ↗</button><button id="psStackClear" class="pt-secondary" type="button">すべて外す</button></div>'+
      '</section>'+
      '<section class="ps-v2-list" aria-labelledby="psListTitle"><div class="ps-v2-listhead"><h2 id="psListTitle">合言葉一覧</h2><span id="psCount" aria-live="polite"></span></div>'+
      '<div id="psResults" class="ps-v2-results"></div><button type="button" id="psMore" class="ps-v2-more" hidden>さらに表示</button>'+
      '<details class="ps-recipe-disclosure"><summary>おすすめの組み合わせから始める <span>↗</span></summary>'+
      '<div class="ps-recipes">'+RECIPES.map((recipe,index)=>'<button type="button" data-ps-recipe="'+index+'"><strong>'+html(recipe.label)+'</strong><small>'+html(recipe.description)+'</small><span>'+recipe.keys.map(html).join(' ＋ ')+'</span></button>').join('')+'</div></details>'+
      '</section>'+
      '<p class="ps-v2-footnote">登録された指示の原文は変更しない。連結の順番は自由に変更できる。文章の自動生成・AIへの送信は行わない。お気に入りの合言葉キーだけ端末に保存する。</p>'+
      '</section>'+
      '<div id="psBottomBar" class="ps-bottom-bar" hidden><span id="psBottomCount"></span><button id="psBottomReview" type="button">内容を見る</button><button id="psBottomCopy" type="button">まとめてコピー ↗</button></div>';

    const root=$('#app');
    root.addEventListener('click',event=>{
      const favorite=event.target.closest('[data-ps-favorite]');
      if(favorite){setFavorite(favorite.dataset.psFavorite);return;}
      const copyBtn=event.target.closest('[data-ps-copy]');
      if(copyBtn){const item=byKey(copyBtn.dataset.psCopy);if(item)copy(item.content,copyBtn,item.key);return;}
      const add=event.target.closest('[data-ps-add]');
      if(add){addKey(add.dataset.psAdd);return;}
      const quickBtn=event.target.closest('[data-ps-quick]');
      if(quickBtn){const row=byKey(quickBtn.dataset.psQuick);if(row?.kind==='prompt')copy(row.content,quickBtn,row.key);else if(row?.url)window.open(row.url,'_blank','noopener');return;}
      const recipe=event.target.closest('[data-ps-recipe]');
      if(recipe){const selected=RECIPES[Number(recipe.dataset.psRecipe)];state.selected=[...selected.keys];refreshComposer();updateResults();showStack();return;}
      const groupBtn=event.target.closest('[data-ps-intent]');
      if(groupBtn){state.intent=groupBtn.dataset.psIntent;state.listLimit=14;updateResults();return;}
      if(event.target.closest('#psOnlyFavorites')){state.favoritesOnly=!state.favoritesOnly;state.listLimit=14;updateResults();return;}
      if(event.target.closest('#psResetAdvanced')){state.intent='すべて';state.role='すべて';state.favoritesOnly=false;state.search='';$('#psSearch').value='';state.listLimit=14;updateResults();return;}
      if(event.target.closest('#psResetFilters')){state.intent='すべて';state.role='すべて';state.favoritesOnly=false;state.search='';$('#psSearch').value='';state.listLimit=14;updateResults();return;}
      if(event.target.closest('#psMore')){state.listLimit+=14;updateResults();return;}
      if(event.target.closest('#psAddAliases')){state.selected=aliases(state.search).filter(key=>byKey(key)?.kind==='prompt');refreshComposer();updateResults();showStack();return;}
      const move=event.target.closest('[data-ps-move]');
      if(move){reorder(move.dataset.psKey,Number(move.dataset.psMove));return;}
      const remove=event.target.closest('[data-ps-remove]');
      if(remove){addKey(remove.dataset.psRemove);return;}
      if(event.target.closest('#psStackClear')){state.selected=[];refreshComposer();updateResults();return;}
      const copyStack=event.target.closest('#psStackCopy');
      if(copyStack){copy(combined(),copyStack,'連結したプロンプト');return;}
      const detail=event.target.closest('[href^="#/prompt-transforms/shortcuts/"]');
      if(detail)state.listScroll=window.scrollY;
    });
    $('#psSearch').addEventListener('input',event=>{state.search=event.target.value;state.listLimit=14;updateResults();});
    $('#psRole').addEventListener('change',event=>{state.role=event.target.value;state.listLimit=14;updateResults();});
    $('#psAdvanced').addEventListener('toggle',event=>{state.moreFilters=event.target.open;});
    $('#psPreviewDisclosure').addEventListener('toggle',event=>{state.showFull=event.target.open;});
    $('#psBottomBar').addEventListener('click',event=>{
      if(event.target.closest('#psBottomReview'))showStack();
      const copyBtn=event.target.closest('#psBottomCopy');
      if(copyBtn)copy(combined(),copyBtn,'連結したプロンプト');
    });
    updateResults();refreshComposer();
    requestAnimationFrame(()=>{
      window.scrollTo({top:state.listScroll,behavior:'instant'});
      if(state.returnFocus){
        const key=state.returnFocus;
        state.returnFocus=null;
        $('#psResults [data-ps-row="'+CSS.escape(key)+'"] a')?.focus({preventScroll:true});
      }
    });
  }

  function renderDetail(item) {
    const isLink=item.kind==='link';
    document.title=item.key+' — 合言葉辞書';
    $('#app').innerHTML=
      '<article class="pt-page ps-v2 ps-v2-detail" aria-labelledby="psDetailTitle">'+
      '<div class="pt-topline"><a class="pt-back" href="'+ROOT+'">← 合言葉一覧へ</a><span>'+html(item.intent)+' / '+html(item.role)+'</span></div>'+
      '<header class="ps-v2-hero"><p class="pt-eyebrow">SHORTCUT / '+html(item.key)+'</p><h1 id="psDetailTitle" tabindex="-1">'+html(item.title)+'</h1><p>'+html(item.summary)+'</p></header>'+
      '<section class="ps-v2-full"><div class="ps-v2-listhead"><h2>登録内容（原文）</h2><span>'+html(item.key)+'</span></div>'+
      '<pre id="psFullText" tabindex="0">'+html(isLink?item.url:item.content)+'</pre>'+
      '<div class="ps-detail-actions">'+(isLink?'<a class="pt-primary ps-v2-link-button" href="'+html(item.url)+'" target="_blank" rel="noopener noreferrer">サイトを開く ↗</a>':
      '<button type="button" class="pt-primary" id="psCopyOriginal">原文をコピー ↗</button>')+
      '<button type="button" class="pt-secondary" id="psCopyUrl">この項目のURLをコピー</button></div></section></article>';
    $('#psCopyOriginal')?.addEventListener('click',event=>copy(item.content,event.currentTarget,'原文'));
    $('#psCopyUrl')?.addEventListener('click',event=>copy(location.href,event.currentTarget,'項目のURL'));
    requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
  }
  async function render(id='') {
    const root=$('#app');
    root.innerHTML='<div class="pt-loading" role="status">合言葉を読み込み中…</div>';
    try{
      await load();
      if(!isActive()||currentPath()!==id)return;
      if(id){
        const entry=byKey(id);
        if(entry){state.returnFocus=id;renderDetail(entry);}
        else root.innerHTML='<div class="pt-page pt-empty"><a href="'+ROOT+'">← 一覧へ</a><p>その合言葉は登録されていない。</p></div>';
      }else renderList();
    }catch(error){
      console.error(error);
      if(isActive())root.innerHTML='<div class="pt-page pt-empty"><p>合言葉を読み込めませんでした。</p><button type="button" id="psRetry">再試行</button></div>';
      $('#psRetry')?.addEventListener('click',()=>render(id));
    }
  }
  function onSlash(event) {
    event.preventDefault();
    if(location.hash!==ROOT)location.hash=ROOT;
    else $('#psSearch')?.focus();
    return true;
  }
  function onEscape(event) {
    event.preventDefault();
    location.hash=location.hash===ROOT?'#/prompt-transforms':ROOT;
    return true;
  }
  window.PromptShortcuts={render,onSlash,onEscape};
})();
