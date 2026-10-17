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

const COMPOSITE_BAKED_FORM = /\b(muffin|torta|cake|brownie|biscott|plumcake|pane|focaccia|cheesecake|sformato|pasticcio)\b/;
const MIXTURE_TRANSFORM = /\b(mescol|amalgam|impast|unisc|incorpor|frull|monta|sbatt|composto|impasto|pastella)\w*/;
const HEAT_TRANSFORM = /\b(inforn|forno|cuoc|cott|forn|sforn)\w*|\b\d+\s*minut\w*\s+(?:a|in)\s+\d{2,3}\b/;

function preparationMode(facts, stepsText) {
  const title = normalize(facts.title);
  const compositeForm = title.match(COMPOSITE_BAKED_FORM);
  if (!compositeForm) return {kind: 'DIRECT_PRESENTATION'};
  const hasMixtureTransform = MIXTURE_TRANSFORM.test(stepsText);
  const hasHeatTransform = HEAT_TRANSFORM.test(stepsText);
  if (hasMixtureTransform && hasHeatTransform) {
    return {kind: 'COOKED_COMPOSITE', unit: compositeForm[1].toUpperCase()};
  }
  throw new Error(`DISPLAY_ROLE_AMBIGUOUS_TRANSFORMED_PREPARATION:${facts.title}`);
}

function classifyIngredient(name, stepsText, mode) {
  const key = stem(name);
  if (!key) throw new Error('DISPLAY_ROLE_EMPTY_INGREDIENT');
  const surfacePattern = new RegExp(`(rotol|rivest|impan|spolver)[^.]{0,80}${key}|${key}[^.]{0,80}(rivest|ader|copertura)`);
  const removedPattern = new RegExp(`(rimuov|togli|elimina|scarta)[^.]{0,80}${key}`);
  const integratedPattern = new RegExp(`(frull|trit|sciogl|sfum|emulsion|mescol|amalgam|impast)[^.]{0,100}${key}|${key}[^.]{0,100}(trit|frull|sciolt|incorpor)`);
  if (removedPattern.test(stepsText)) return 'NOT_VISIBLE_AFTER_PROCESS';
  if (surfacePattern.test(stepsText)) return 'SURFACE_BOUND_VISIBLE';
  // Once ingredients are mixed into a cooked composite, the visible hero is the
  // prepared form. Even chunks explicitly kept "inside" belong to that form and
  // must never become a loose ingredient, garnish or surrounding pile.
  if (mode.kind === 'COOKED_COMPOSITE') return 'INTEGRATED_ONLY';
  if (integratedPattern.test(stepsText) || seasoning.test(normalize(name))) return 'INTEGRATED_ONLY';
  return 'PRIMARY_VISIBLE';
}

function exactCount(facts, stepsText, mode) {
  const words = {una: 1, un: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10};
  const match = stepsText.match(/(?:forma|disponi|crea|prepara)\s+(una|un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|\d+)\s+([a-z]+)/);
  if (!match) return {count: 1, unit: mode.kind === 'COOKED_COMPOSITE' ? mode.unit : 'COMPLETE_RECIPE'};
  return {count: Number(match[1]) || words[match[1]], unit: match[2].toUpperCase()};
}

function buildDisplayPlan(facts) {
  if (!facts || !Array.isArray(facts.ingredients) || !facts.ingredients.length || !Array.isArray(facts.steps) || !facts.steps.length) {
    throw new Error('DISPLAY_ROLE_SOURCE_INCOMPLETE');
  }
  const stepsText = normalize(facts.steps.join(' '));
  const mode = preparationMode(facts, stepsText);
  const roles = Object.fromEntries(ROLE_NAMES.map((role) => [role, []]));
  for (const ingredient of facts.ingredients) {
    const role = classifyIngredient(ingredient.name, stepsText, mode);
    roles[role].push(ingredient.name);
  }
  roles.FORBIDDEN_VISIBLE = [...UNIVERSAL_FORBIDDEN];
  const count = exactCount(facts, stepsText, mode);
  const plan = {
    version: 'DISPLAY_ROLE_V1',
    subject: facts.title,
    preparationMode: mode.kind,
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
  if (!['DIRECT_PRESENTATION', 'COOKED_COMPOSITE'].includes(plan.preparationMode)) throw new Error('DISPLAY_PREPARATION_MODE_INVALID');
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
