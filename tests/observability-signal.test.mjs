import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OBSERVABILITY_CONTRACT_REVISION,
  OBSERVABILITY_OPERATIONAL_SIGNAL_CONTRACT_ID,
  OBSERVABILITY_STATES,
  buildOperationalSignal,
} from '../src/observability-signal.mjs';

test('pins the authoritative Observability v1 source contract', () => {
  assert.equal(OBSERVABILITY_CONTRACT_REVISION, 'a7f6a65f442d3e517baddbe7b6ce7c250d142c8c');
  assert.equal(
    OBSERVABILITY_OPERATIONAL_SIGNAL_CONTRACT_ID,
    'https://goreecloud.com/contracts/observability/operational-signal/v1',
  );
});

test('constructs an exact-shape privacy-minimized operational signal', () => {
  const signal = buildOperationalSignal({
    signalId: 'privacy-runtime-readiness-001',
    source: 'privacy-runtime',
    signalType: 'readiness',
    state: 'degraded',
    observedAt: '2026-09-22T22:00:00Z',
    collectedAt: '2026-09-22T22:00:01Z',
    ttlSeconds: 60,
    correlationId: 'corr-001',
    attributes: { durable_state: true, provider_selected: false },
    collectionGaps: ['live-observability-publication-not-configured'],
  });

  assert.deepEqual(Object.keys(signal).sort(), [
    'attributes',
    'collected_at',
    'collection_gaps',
    'component_id',
    'correlation_id',
    'observed_at',
    'signal_id',
    'signal_type',
    'source',
    'state',
    'ttl_seconds',
  ].sort());
  assert.equal(signal.component_id, 'goreecloud-privacy-shield');
  assert.equal(signal.state, 'degraded');
});

test('preserves the complete Observability state vocabulary', () => {
  assert.deepEqual(OBSERVABILITY_STATES, [
    'healthy',
    'degraded',
    'failed',
    'unavailable',
    'unknown',
    'stale',
    'partially_observed',
    'not_monitored',
    'not_applicable',
  ]);
});

test('allows explicit unknown state instead of manufacturing healthy evidence', () => {
  const signal = buildOperationalSignal({
    signalId: 'provider-health-unknown',
    source: 'provider-governance',
    signalType: 'provider-health',
    state: 'unknown',
    observedAt: '2026-09-22T22:00:00Z',
    collectedAt: '2026-09-22T22:00:00Z',
    ttlSeconds: 30,
  });
  assert.equal(signal.state, 'unknown');
});

test('rejects unsupported states and invalid TTL values', () => {
  const base = {
    signalId: 's',
    source: 'privacy-runtime',
    signalType: 'readiness',
    observedAt: '2026-09-22T22:00:00Z',
    collectedAt: '2026-09-22T22:00:00Z',
  };
  assert.throws(() => buildOperationalSignal({ ...base, state: 'ok', ttlSeconds: 60 }), /unsupported Observability state/);
  assert.throws(() => buildOperationalSignal({ ...base, state: 'healthy', ttlSeconds: 0 }), /ttlSeconds/);
  assert.throws(() => buildOperationalSignal({ ...base, state: 'healthy', ttlSeconds: 86401 }), /ttlSeconds/);
});

test('rejects obvious secret-bearing and privacy-sensitive attributes recursively', () => {
  const base = {
    signalId: 's',
    source: 'privacy-runtime',
    signalType: 'readiness',
    state: 'unknown',
    observedAt: '2026-09-22T22:00:00Z',
    collectedAt: '2026-09-22T22:00:00Z',
    ttlSeconds: 60,
  };
  assert.throws(() => buildOperationalSignal({ ...base, attributes: { access_token: 'secret' } }), /not allowed/);
  assert.throws(() => buildOperationalSignal({ ...base, attributes: { nested: { user_id: '123' } } }), /not allowed/);
  assert.throws(() => buildOperationalSignal({ ...base, attributes: { request_body: 'private' } }), /not allowed/);
});

test('rejects malformed timestamps, collection gaps, and correlation ids', () => {
  const base = {
    signalId: 's',
    source: 'privacy-runtime',
    signalType: 'readiness',
    state: 'unknown',
    observedAt: '2026-09-22T22:00:00Z',
    collectedAt: '2026-09-22T22:00:00Z',
    ttlSeconds: 60,
  };
  assert.throws(() => buildOperationalSignal({ ...base, observedAt: 'not-a-time' }), /timestamp/);
  assert.throws(() => buildOperationalSignal({ ...base, correlationId: '' }), /correlationId/);
  assert.throws(() => buildOperationalSignal({ ...base, collectionGaps: [''] }), /collectionGaps/);
});
