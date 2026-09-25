import assert from 'node:assert/strict';
import test from 'node:test';
import {PrivacyDecisionPoint, PrivacyDecision} from '../src/privacy-decision-point.mjs';

function evaluate(expires_at) {
  const pdp = new PrivacyDecisionPoint({
    manifests: new Map([['app', {resources: [{
      resource: 'doc', purposes: ['read'], operations: ['read'],
      processing_zones: ['local'], destinations: ['app']
    }]}]]),
    consents: new Map([['consent', {
      purpose: 'read', processing_zones: ['local'], destinations: ['app'], expires_at
    }]])
  });
  return pdp.evaluate({
    request_id: 'req-expiry', requester: {id: 'app'}, resource: {id: 'doc'},
    purpose: 'read', operation: 'read', processing_zone: 'local', destination: 'app',
    retention: {mode: 'none'}, consent_reference: 'consent'
  });
}

test('malformed consent expiry never authorizes a request', () => {
  for (const expiry of ['invalid', '', ' ', '999999-01-01T00:00:00Z', 0, false, true, [], {}, ['2099-01-01']]) {
    const result = evaluate(expiry);
    assert.equal(result.outcome, PrivacyDecision.DENY);
    assert.equal(result.reason_code, 'CONSENT_EXPIRED');
    assert.deepEqual(result.permitted_operations, []);
    assert.equal(result.capability_token_reference, null);
  }
});

test('expired consent is denied and valid future consent remains usable', () => {
  assert.equal(evaluate(new Date(Date.now() - 60000).toISOString()).outcome, PrivacyDecision.DENY);
  assert.equal(evaluate(new Date(Date.now() + 3600000).toISOString()).outcome, PrivacyDecision.ALLOW);
});

test('absent optional expiry preserves the existing consent contract', () => {
  for (const expiry of [undefined, null]) assert.equal(evaluate(expiry).outcome, PrivacyDecision.ALLOW);
});
