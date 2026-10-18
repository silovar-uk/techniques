import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const data=JSON.parse(readFileSync(new URL('../data/prompt-shortcuts.json',import.meta.url),'utf8'));
const script=readFileSync(new URL('../prompt-shortcuts.js',import.meta.url),'utf8');
const marker='window.PromptShortcuts={render,onSlash,onEscape};';
assert.ok(script.includes(marker),'Missing shortcut public interface');
const instrumented=script.replace(marker,marker+'\nwindow.__shortcutTest={state,score,results,aliases,combined,warnings,RECIPES,currentPath};');
const env={
  window:{},location:{hash:'#/prompt-transforms/shortcuts'},
  localStorage:{getItem:()=>null,setItem:()=>{}},
  console
};
vm.runInNewContext(instrumented,env,{filename:'prompt-shortcuts.js'});
const t=env.window.__shortcutTest;
assert.ok(t,'Shortcut testing hooks failed');
t.state.items=data;
assert.equal(data.length,56,'Expected 56 personal shortcuts');
assert.equal(new Set(data.map(item=>item.key)).size,data.length,'Duplicate aliases');
assert.deepEqual([...t.aliases('りさりさ＋せい')],['りさりさ','せい'],'Japanese plus separator');
assert.deepEqual([...t.aliases('りさりさ せい')],['りさりさ','せい'],'Space separator');

for(const key of ['しゅはれ','ぜろべす','すきゃぺあ','ぽとふぉり']){
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
t.state.selected=['りさりさ','せい'];
const multi=t.combined();
assert.ok(multi.includes('【りさりさ｜')&&multi.includes('【せい｜'),'Composition labels missing');
assert.ok(multi.indexOf('【りさりさ｜')<multi.indexOf('【せい｜'),'Composition should preserve ordering');
t.state.selected=['ぜんぞ','みつもん'];
assert.ok(t.warnings().some(x=>x.includes('質問数')),'Conflict warning missing');
t.state.selected=['さごあつ','すきゃぺあ'];
assert.ok(t.warnings().some(x=>x.includes('出力形式')),'Output collision warning missing');
for(const recipe of t.RECIPES){
 assert.ok(recipe.keys.every(key=>data.some(x=>x.key===key&&x.kind==='prompt')),recipe.label+' has invalid shortcut');
}
env.location.hash='#/prompt-transforms/shortcuts';
assert.equal(t.currentPath(),'','List route');
env.location.hash='#/prompt-transforms/shortcuts/%E3%81%9B%E3%81%84';
assert.equal(t.currentPath(),'せい','Detail route');
console.log('✓ Shortcut UI smoke tests: search, classification, composition, warning, recipe, routes');
