import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { buildManagerStatusRecord, MANAGER_STATUS_CAPABILITIES } from '../src/manager-status.mjs';

const statusSchema = JSON.parse(readFileSync(new URL('../contracts/privacy-shield.status.schema.json', import.meta.url), 'utf8'));
const adapterSchema = JSON.parse(readFileSync(new URL('../contracts/privacy-shield.adapter.schema.json', import.meta.url), 'utf8'));

test('Manager producer remains aligned with the shared status privacy and acceptance boundary', () => {
  assert.equal(statusSchema.properties.schema_version.const, 1);
  assert.equal(statusSchema.properties.privacy.properties.raw_private_activity_included.const, false);
  assert.equal(statusSchema.properties.privacy.properties.contains_credentials.const, false);
  assert.equal(statusSchema.properties.privacy.properties.contains_identifiers.const, false);
  assert.equal(statusSchema.properties.acceptance.properties.runtime_acceptance_required.const, true);

  const value = buildManagerStatusRecord({
    generatedAt: '2026-09-29T18:00:00-05:00',
    capabilities: [{ id: 'privacy-status', state: 'pending-acceptance' }],
  });
  assert.deepEqual(
    Object.keys(value).sort(),
    ['acceptance', 'capabilities', 'generated_at', 'privacy', 'producer', 'schema_version', 'state'].sort(),
  );
});

test('Manager producer canonical capability vocabulary is a subset of the adapter contract', () => {
  const contractCapabilities = new Set(adapterSchema.properties.capabilities.items.enum);
  for (const id of MANAGER_STATUS_CAPABILITIES) assert.equal(contractCapabilities.has(id), true, id);
  assert.equal(MANAGER_STATUS_CAPABILITIES.length, contractCapabilities.size);
});
