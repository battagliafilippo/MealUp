'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MANIFEST = 'docs/food-portrait-pipeline/food-portrait-canonical-model-set-v1.json';
const ENVELOPE = 'docs/food-portrait-pipeline/food-portrait-owner-style-envelope-v2.json';
const MANIFEST_SHA256 = 'e47136db61a9d0468c636a1ca0591dbcc377d42d09fbfef8b195cc9643223d66';
const ENVELOPE_SHA256 = '2c992cae46116e70d9fb3ae9175ee7168b1f79fcd14455f9d9618ccbd423899c';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileSha = (file) => sha(fs.readFileSync(file));
const fail = (message) => { throw new Error(message); };

function verifyCanonicalModelSet(root = process.cwd(), options = {}) {
  const manifestPath = path.resolve(root, options.manifest || MANIFEST);
  const envelopePath = path.resolve(root, options.envelope || ENVELOPE);
  const expectedManifestSha = options.expectedManifestSha256 || MANIFEST_SHA256;
  const expectedEnvelopeSha = options.expectedEnvelopeSha256 || ENVELOPE_SHA256;
  if (fileSha(manifestPath) !== expectedManifestSha) fail('CANONICAL_MODEL_MANIFEST_SHA_MISMATCH');
  if (fileSha(envelopePath) !== expectedEnvelopeSha) fail('OWNER_STYLE_ENVELOPE_SHA_MISMATCH');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const envelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
  const entriesSha = sha(JSON.stringify({version: manifest.version, references: manifest.references, selectionPolicy: manifest.selectionPolicy}));
  if (entriesSha !== manifest.entriesSha256) fail('CANONICAL_MODEL_ENTRIES_SHA_MISMATCH');
  if (manifest.status !== 'OWNER_APPROVED_FROZEN_REFERENCE_SET') fail('CANONICAL_MODEL_SET_NOT_FROZEN');
  if (manifest.references.length !== 5 || envelope.referenceIds.length !== 5) fail('CANONICAL_MODEL_COUNT_MISMATCH');
  for (const item of manifest.references) {
    const asset = path.resolve(root, item.asset);
    if (!fs.existsSync(asset) || fileSha(asset) !== item.sha256) fail('CANONICAL_MODEL_ASSET_SHA_MISMATCH:' + item.id);
    if (!item.immutable) fail('CANONICAL_MODEL_NOT_IMMUTABLE:' + item.id);
    if (item.provenance) {
      const parent = path.resolve(root, item.provenance.parent);
      if (!fs.existsSync(parent) || fileSha(parent) !== item.provenance.parentSha256) fail('CANONICAL_MODEL_PARENT_SHA_MISMATCH:' + item.id);
      const crop = item.provenance.crop;
      if (crop.left !== 0 || crop.top !== 688 || crop.width !== 1179 || crop.height !== 1179) fail('CANONICAL_MODEL_CROP_MISMATCH:' + item.id);
    }
  }
  const ids = manifest.references.map((item) => item.id);
  if (JSON.stringify(ids) !== JSON.stringify(envelope.referenceIds)) fail('CANONICAL_MODEL_ENVELOPE_ORDER_MISMATCH');
  return Object.freeze({manifest, envelope, manifestPath: MANIFEST, envelopePath: ENVELOPE, manifestSha256: expectedManifestSha, envelopeSha256: expectedEnvelopeSha});
}

function selectVisualReference(modelSet, facts, frozenReference) {
  const byId = (id) => modelSet.manifest.references.find((item) => item.id === id);
  if (facts.vesselId === 'VESSEL_BOWL') return byId(modelSet.manifest.selectionPolicy.BOWL_DEFAULT);
  if (facts.vesselId === 'VESSEL_PLATE') {
    const text = `${facts.title} ${facts.ingredients.map((item) => item.name).join(' ')}`.toLowerCase();
    if (/cozz|vongol|mare|pesce|baccala|polpo/.test(text)) return byId(modelSet.manifest.selectionPolicy.PLATE_COMPLEX_HOT_WET);
    if (/tartare|burger|polpett|tortino|sformato/.test(text)) return byId(modelSet.manifest.selectionPolicy.PLATE_COMPACT_SCULPTED);
    return byId(modelSet.manifest.selectionPolicy.PLATE_DEFAULT);
  }
  return {id: 'vessel-frozen-' + facts.vesselId.toLowerCase(), recipeId: frozenReference.recipeId, vesselId: facts.vesselId, asset: frozenReference.source, sha256: frozenReference.sha256, roles: ['VESSEL_FROZEN_REFERENCE'], immutable: true};
}

module.exports = {MANIFEST, ENVELOPE, MANIFEST_SHA256, ENVELOPE_SHA256, verifyCanonicalModelSet, selectVisualReference};
