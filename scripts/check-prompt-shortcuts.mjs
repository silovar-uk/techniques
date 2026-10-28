import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const data=JSON.parse(readFileSync(new URL('../data/prompt-shortcuts.json',import.meta.url),'utf8'));
const script=readFileSync(new URL('../prompt-shortcuts.js',import.meta.url),'utf8');
const marker='window.PromptShortcuts={render,onSlash,onEscape};';
assert.ok(script.includes(marker),'Missing shortcut public interface');
const instrumented=script.replace(marker,marker+'\nwindow.__shortcutTest={state,score,results,aliases,combined,warnings,RECIPES,currentPath,eligibleDiscoveryItems,drawDiscovery,buildDiscoveryContent};');
const env={
  window:{},location:{hash:'#/prompt-transforms/shortcuts'},
  localStorage:{getItem:()=>null,setItem:()=>{}},
  console
};
vm.runInNewContext(instrumented,env,{filename:'prompt-shortcuts.js'});
const t=env.window.__shortcutTest;
assert.ok(t,'Shortcut testing hooks failed');
t.state.items=data;
assert.ok(data.length>=64,'Personal shortcuts must not fall below the tested baseline of 64');
assert.ok(data.filter(x=>x.kind==='prompt').length>=61,'Prompts must not fall below the tested baseline of 61');
assert.equal(new Set(data.map(item=>item.key)).size,data.length,'Duplicate aliases');
assert.equal(data.find(x=>x.key==='tm')?.content,'端的に短く答えて。','tm shortcut should preserve original text');
assert.deepEqual([...t.aliases('りさりさ＋せいぷろ')],['りさりさ','せいぷろ'],'Japanese plus separator');
assert.deepEqual([...t.aliases('りさりさ せいぷろ')],['りさりさ','せいぷろ'],'Space separator');

for(const key of ['しゅはれ','ぜろべす','すきゃぺあ','ぽとふぉり','いもちょう','へそどこ']){
  const hit=data.find(item=>item.key===key);
  assert.ok(hit,key+' missing');
  t.state.search=key;t.state.intent='すべて';t.state.role='すべて';
  assert.equal(t.results()[0]?.key,key,'Exact alias search should rank first: '+key);
}
t.state.search='';t.state.intent='作る';t.state.role='主指示';
assert.ok(t.results().some(x=>x.key==='しゅはれ'),'Two-axis search should find shuhare');
assert.ok(t.results().every(x=>x.intent==='作る'&&x.role==='主指示'),'Filter leakage');

t.state.intent='すべて';t.state.role='すべて';
t.state.selected=['りさりさ'];
assert.equal(t.combined(),data.find(x=>x.key==='りさりさ').content,'Single alias must be byte-faithful');
t.state.selected=['りさりさ','せいぷろ'];
const multi=t.combined();
assert.ok(multi.includes('【りさりさ｜')&&multi.includes('【せいぷろ｜'),'Composition labels missing');
assert.ok(multi.indexOf('【りさりさ｜')<multi.indexOf('【せいぷろ｜'),'Composition should preserve ordering');
t.state.selected=['ぜんぞ','みつもん'];
assert.ok(t.warnings().some(x=>x.includes('質問数')),'Conflict warning missing');
t.state.selected=['さごあつ','すきゃぺあ'];
assert.ok(t.warnings().some(x=>x.includes('出力形式')),'Output collision warning missing');
for(const recipe of t.RECIPES){
 assert.ok(recipe.keys.every(key=>data.some(x=>x.key===key&&x.kind==='prompt')),recipe.label+' has invalid shortcut');
}

const eligible=t.eligibleDiscoveryItems();
assert.equal(eligible.length,data.filter(x=>x.kind==='prompt').length,'Only actual prompts belong in discovery');
const seen=new Set();
for(let i=0;i<eligible.length;i++){
  const drawn=t.drawDiscovery();
  assert.ok(drawn&&drawn.kind==='prompt','Discovery must never pick a link');
  assert.ok(!seen.has(drawn.key),'Discovery repeated a prompt before full cycle');
  seen.add(drawn.key);
}
const last=t.state.discoveryKey;
assert.notEqual(t.drawDiscovery().key,last,'Discovery must not repeat at deck boundary');
assert.ok(t.buildDiscoveryContent(data.find(x=>x.key==='しゅはれ')).includes('UX重視'),'Discovery should show actual title');
assert.ok(t.buildDiscoveryContent(data.find(x=>x.key==='しゅはれ')).includes('プロンプト原文'),'Discovery should expose original text');
env.location.hash='#/prompt-transforms/shortcuts';
assert.equal(t.currentPath(),'','List route');
env.location.hash='#/prompt-transforms/shortcuts/'+encodeURIComponent('せいぷろ');
assert.equal(t.currentPath(),'せいぷろ','Detail route');
console.log('✓ Shortcut UI smoke tests: search, classification, composition, warning, recipe, routes, nonrepeating discovery');
