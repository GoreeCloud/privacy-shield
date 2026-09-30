import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MANAGER_STATUS_ADAPTER_ID,
  MANAGER_STATUS_RUNTIME_AUTHORITY,
  buildManagerStatusRecord,
} from '../src/manager-status.mjs';

function record(overrides = {}) {
  return buildManagerStatusRecord({
    generatedAt: '2026-09-29T18:00:00-05:00',
    state: 'development',
    capabilities: [
      { id: 'privacy-status', state: 'pending-acceptance' },
      { id: 'data-minimization', state: 'pending-acceptance' },
    ],
    ...overrides,
  });
}

test('constructs the shared Manager status contract with privacy guarantees fixed false', () => {
  const value = record();
  assert.equal(value.schema_version, 1);
  assert.equal(value.producer.adapter_id, MANAGER_STATUS_ADAPTER_ID);
  assert.equal(value.producer.runtime_authority, MANAGER_STATUS_RUNTIME_AUTHORITY);
  assert.deepEqual(value.privacy, {
    raw_private_activity_included: false,
    contains_credentials: false,
    contains_identifiers: false,
  });
  assert.deepEqual(value.acceptance, {
    runtime_acceptance_required: true,
    production_approved: false,
  });
});

test('cannot self-report protected, active runtime capability, or production approval', () => {
  assert.throws(() => record({ state: 'protected' }), /protected requires separate accepted runtime evidence/);
  assert.throws(
    () => record({ capabilities: [{ id: 'privacy-status', state: 'active' }] }),
    /separate runtime acceptance/,
  );
  const value = record();
  assert.equal(value.acceptance.production_approved, false);
});

test('rejects unknown and duplicate capabilities', () => {
  assert.throws(
    () => record({ capabilities: [{ id: 'invented-capability', state: 'pending-acceptance' }] }),
    /unsupported Privacy Shield capability/,
  );
  assert.throws(
    () => record({
      capabilities: [
        { id: 'privacy-status', state: 'pending-acceptance' },
        { id: 'privacy-status', state: 'unavailable' },
      ],
    }),
    /must be unique/,
  );
});

test('requires explicit timezone and ordered validity', () => {
  assert.throws(() => record({ generatedAt: '2026-09-29T18:00:00' }), /timezone-qualified/);
  assert.throws(
    () => record({ validUntil: '2026-09-29T17:59:59-05:00' }),
    /later than generatedAt/,
  );
  const value = record({ validUntil: '2026-09-29T18:05:00-05:00' });
  assert.equal(value.valid_until, '2026-09-29T18:05:00-05:00');
});
