'use strict';

const ROLE_NAMES = Object.freeze([
  'PRIMARY_VISIBLE',
  'SURFACE_BOUND_VISIBLE',
  'INTEGRATED_ONLY',
  'NOT_VISIBLE_AFTER_PROCESS',
  'FORBIDDEN_VISIBLE'
]);

const TEXTURE_BUDGET = Object.freeze({
  target: 'SIMPLIFIED_TOYS_3D',
  frequency: 'LOW_ONLY',
  surfaces: 'SMOOTH_CONTINUOUS_SOFT_GLOSS',
  highlights: 'BROAD_CONTROLLED',
  forbidden: ['PORES', 'FIBERS', 'POWDER_GRAIN', 'MICRO_STRIATION', 'WRINKLES', 'NOISY_SPECULARS', 'PHOTOGRAPHIC_CRUST']
});

const UNIVERSAL_FORBIDDEN = Object.freeze([
  'UNLISTED_FOOD', 'LOOSE_BED', 'LOOSE_PILE', 'LOOSE_DUSTING', 'SCATTERED_CRUMBS',
  'SCATTERED_SEEDS', 'DECORATIVE_HERBS', 'DECORATIVE_DROPLETS', 'PEARLS', 'FLOWERS'
]);

const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const stem = (name) => normalize(name).split(/\s+/)[0].replace(/[^a-z0-9]/g, '').slice(0, 6);
const mentions = (text, name) => text.includes(stem(name));
const seasoning = /^(olio|sale|pepe|aglio|aceto|vino|senape|paprika|cannella|succo|scorza|lievito)/;

function classifyIngredient(name, stepsText) {
  const key = stem(name);
  if (!key) throw new Error('DISPLAY_ROLE_EMPTY_INGREDIENT');
  const surfacePattern = new RegExp(`(rotol|rivest|impan|spolver)[^.]{0,80}${key}|${key}[^.]{0,80}(rivest|ader|copertura)`);
  const removedPattern = new RegExp(`(rimuov|togli|elimina|scarta)[^.]{0,80}${key}`);
  const integratedPattern = new RegExp(`(frull|trit|sciogl|sfum|emulsion|mescol|amalgam|impast)[^.]{0,100}${key}|${key}[^.]{0,100}(trit|frull|sciolt|incorpor)`);
  if (removedPattern.test(stepsText)) return 'NOT_VISIBLE_AFTER_PROCESS';
  if (surfacePattern.test(stepsText)) return 'SURFACE_BOUND_VISIBLE';
  if (integratedPattern.test(stepsText) || seasoning.test(normalize(name))) return 'INTEGRATED_ONLY';
  return 'PRIMARY_VISIBLE';
}

function exactCount(facts, stepsText) {
  const words = {una: 1, un: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10};
  const match = stepsText.match(/(?:forma|disponi|crea|prepara)\s+(una|un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|\d+)\s+([a-z]+)/);
  if (!match) return {count: 1, unit: 'COMPLETE_RECIPE'};
  return {count: Number(match[1]) || words[match[1]], unit: match[2].toUpperCase()};
}

function buildDisplayPlan(facts) {
  if (!facts || !Array.isArray(facts.ingredients) || !facts.ingredients.length || !Array.isArray(facts.steps) || !facts.steps.length) {
    throw new Error('DISPLAY_ROLE_SOURCE_INCOMPLETE');
  }
  const stepsText = normalize(facts.steps.join(' '));
  const roles = Object.fromEntries(ROLE_NAMES.map((role) => [role, []]));
  for (const ingredient of facts.ingredients) {
    const role = classifyIngredient(ingredient.name, stepsText);
    roles[role].push(ingredient.name);
  }
  roles.FORBIDDEN_VISIBLE = [...UNIVERSAL_FORBIDDEN];
  const count = exactCount(facts, stepsText);
  const plan = {
    version: 'DISPLAY_ROLE_V1',
    subject: facts.title,
    exactCount: count,
    roles,
    cleanBaseAndRim: true,
    ambiguityPolicy: 'BLOCK_BEFORE_IMAGEGEN'
  };
  validateDisplayPlan(plan, facts);
  return Object.freeze(plan);
}

function validateDisplayPlan(plan, facts) {
  if (plan?.version !== 'DISPLAY_ROLE_V1' || plan.cleanBaseAndRim !== true) throw new Error('DISPLAY_PLAN_INVALID');
  for (const role of ROLE_NAMES) if (!Array.isArray(plan.roles?.[role])) throw new Error('DISPLAY_ROLE_MISSING:' + role);
  const assigned = ['PRIMARY_VISIBLE', 'SURFACE_BOUND_VISIBLE', 'INTEGRATED_ONLY', 'NOT_VISIBLE_AFTER_PROCESS']
    .flatMap((role) => plan.roles[role]);
  const expected = facts.ingredients.map((item) => item.name);
  if (assigned.length !== expected.length || new Set(assigned).size !== assigned.length) throw new Error('DISPLAY_ROLE_NOT_TOTAL_OR_DISJOINT');
  for (const name of expected) if (!assigned.includes(name)) throw new Error('DISPLAY_ROLE_UNCLASSIFIED:' + name);
  if (!Number.isInteger(plan.exactCount?.count) || plan.exactCount.count < 1) throw new Error('DISPLAY_COUNT_UNRESOLVED');
  if (!plan.roles.FORBIDDEN_VISIBLE.includes('LOOSE_BED') || !plan.roles.FORBIDDEN_VISIBLE.includes('LOOSE_DUSTING')) throw new Error('DISPLAY_FORBIDDEN_INCOMPLETE');
  return true;
}

function validateTextureBudget(budget) {
  if (JSON.stringify(budget) !== JSON.stringify(TEXTURE_BUDGET)) throw new Error('TEXTURE_BUDGET_MISMATCH');
  return true;
}

module.exports = {ROLE_NAMES, TEXTURE_BUDGET, UNIVERSAL_FORBIDDEN, buildDisplayPlan, validateDisplayPlan, validateTextureBudget};
