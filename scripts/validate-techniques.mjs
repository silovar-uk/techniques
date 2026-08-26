import { readFileSync } from 'node:fs';

const TECHNIQUES_FILE = new URL('../data/techniques.json', import.meta.url);
const CATEGORIES_FILE = new URL('../data/categories.json', import.meta.url);
const ALLOWED_EVIDENCE = new Set(['VERIFIED', 'SUPPORTED', 'PERSONAL']);

const errors = [];
const warnings = [];

function fail(scope, message) {
  errors.push(`${scope}: ${message}`);
}

function warn(scope, message) {
  warnings.push(`${scope}: ${message}`);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function readJson(file, label) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`✗ ${label} を読み込めません: ${error.message}`);
    process.exit(1);
  }
}

const categories = readJson(CATEGORIES_FILE, 'data/categories.json');
if (!Array.isArray(categories) || !categories.length) {
  console.error('✗ data/categories.json は1件以上のカテゴリを持つ配列である必要があります。');
  process.exit(1);
}

const seenCategories = new Set();
categories.forEach((category, index) => {
  const scope = `categories[${index}]`;
  if (!isNonEmptyString(category)) fail(scope, '空でない文字列が必要です');
  if (seenCategories.has(category)) fail(scope, `カテゴリが重複しています: ${category}`);
  seenCategories.add(category);
});
const allowedCategories = new Set(categories);

const techniques = readJson(TECHNIQUES_FILE, 'data/techniques.json');
if (!Array.isArray(techniques)) {
  console.error('✗ data/techniques.json のトップレベルは配列である必要があります。');
  process.exit(1);
}

const seenIds = new Set();
const seenNumbers = new Set();
const requiredStrings = ['id', 'number', 'title', 'summary', 'category', 'updated', 'quickAnswer'];
const arrayFields = ['tags', 'steps', 'commands', 'explanation', 'tips', 'sources'];

techniques.forEach((item, index) => {
  const scope = `#${index + 1}${item?.number ? ` ${item.number}` : ''}`;

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    fail(scope, 'Techniqueはオブジェクトである必要があります');
    return;
  }

  requiredStrings.forEach((field) => {
    if (!isNonEmptyString(item[field])) fail(scope, `${field} は空でない文字列が必要です`);
  });

  if (isNonEmptyString(item.id)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) {
      fail(scope, `id は小文字英数字とハイフンのみ: ${item.id}`);
    }
    if (seenIds.has(item.id)) fail(scope, `id が重複しています: ${item.id}`);
    seenIds.add(item.id);
  }

  if (isNonEmptyString(item.number)) {
    if (!/^T-\d{3,}$/.test(item.number)) fail(scope, `number は T-001 形式にしてください: ${item.number}`);
    if (seenNumbers.has(item.number)) fail(scope, `number が重複しています: ${item.number}`);
    seenNumbers.add(item.number);
  }

  if (isNonEmptyString(item.category) && !allowedCategories.has(item.category)) {
    fail(scope, `data/categories.json にないカテゴリです: ${item.category}`);
  }

  if (isNonEmptyString(item.updated) && !isValidDate(item.updated)) {
    fail(scope, `updated は実在する YYYY-MM-DD にしてください: ${item.updated}`);
  }

  arrayFields.forEach((field) => {
    if (!Array.isArray(item[field])) fail(scope, `${field} は配列である必要があります`);
  });

  if (Array.isArray(item.tags)) {
    item.tags.forEach((tag, tagIndex) => {
      if (!isNonEmptyString(tag)) fail(scope, `tags[${tagIndex}] は空でない文字列が必要です`);
    });
  }

  if (Array.isArray(item.steps)) {
    if (item.steps.length === 0) warn(scope, 'steps が空です');
    item.steps.forEach((step, stepIndex) => {
      if (!isNonEmptyString(step)) fail(scope, `steps[${stepIndex}] は空でない文字列が必要です`);
    });
  }

  if (Array.isArray(item.commands)) {
    item.commands.forEach((command, commandIndex) => {
      if (!command || typeof command !== 'object' || Array.isArray(command)) {
        fail(scope, `commands[${commandIndex}] はオブジェクトである必要があります`);
        return;
      }
      if (!isNonEmptyString(command.label)) fail(scope, `commands[${commandIndex}].label が必要です`);
      if (!isNonEmptyString(command.code)) fail(scope, `commands[${commandIndex}].code が必要です`);
      if (command.note != null && typeof command.note !== 'string') fail(scope, `commands[${commandIndex}].note は文字列にしてください`);
    });
  }

  if (Array.isArray(item.explanation)) {
    item.explanation.forEach((row, rowIndex) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        fail(scope, `explanation[${rowIndex}] はオブジェクトである必要があります`);
        return;
      }
      if (!isNonEmptyString(row.term)) fail(scope, `explanation[${rowIndex}].term が必要です`);
      if (!isNonEmptyString(row.text)) fail(scope, `explanation[${rowIndex}].text が必要です`);
    });
  }

  if (Array.isArray(item.tips)) {
    item.tips.forEach((tip, tipIndex) => {
      if (!isNonEmptyString(tip)) fail(scope, `tips[${tipIndex}] は空でない文字列が必要です`);
    });
  }

  if (Array.isArray(item.sources)) {
    item.sources.forEach((source, sourceIndex) => {
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        fail(scope, `sources[${sourceIndex}] はオブジェクトである必要があります`);
        return;
      }
      if (!isNonEmptyString(source.label)) fail(scope, `sources[${sourceIndex}].label が必要です`);
      if (!isNonEmptyString(source.url) || !isHttpUrl(source.url)) {
        fail(scope, `sources[${sourceIndex}].url は http(s) URL にしてください: ${source.url ?? ''}`);
      }
    });
  }

  if (!item.evidence || typeof item.evidence !== 'object' || Array.isArray(item.evidence)) {
    fail(scope, 'evidence オブジェクトが必要です');
  } else {
    const level = String(item.evidence.level || '').toUpperCase();
    if (!ALLOWED_EVIDENCE.has(level)) {
      fail(scope, `evidence.level は VERIFIED / SUPPORTED / PERSONAL のいずれか: ${item.evidence.level ?? ''}`);
    }
    if (!isNonEmptyString(item.evidence.note)) fail(scope, 'evidence.note が必要です');
  }
});

warnings.forEach((message) => console.warn(`! ${message}`));

if (errors.length) {
  errors.forEach((message) => console.error(`✗ ${message}`));
  console.error(`\nValidation failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}

console.log(`✓ ${techniques.length} Techniques / ${categories.length} categories validated (${warnings.length} warning(s)).`);
