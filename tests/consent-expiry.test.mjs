import assert from 'node:assert/strict';
import test from 'node:test';
import {PrivacyDecisionPoint, PrivacyDecision} from '../src/privacy-decision-point.mjs';

function evaluateConsent(consent) {
  const pdp = new PrivacyDecisionPoint({
    manifests: new Map([['app', {resources: [{
      resource: 'doc', purposes: ['read'], operations: ['read'],
      processing_zones: ['local'], destinations: ['app']
    }]}]]),
    consents: new Map([['consent', consent]])
  });
  return pdp.evaluate({
    request_id: 'req-expiry', requester: {id: 'app'}, resource: {id: 'doc'},
    purpose: 'read', operation: 'read', processing_zone: 'local', destination: 'app',
    retention: {mode: 'none'}, consent_reference: 'consent'
  });
}

function evaluate(expires_at) {
  return evaluateConsent({
    purpose: 'read', processing_zones: ['local'], destinations: ['app'], expires_at
  });
}

test('malformed legacy consent records never authorize a request', () => {
  for (const consent of [
    true,
    1,
    'granted',
    [],
    new Date('2099-01-01T00:00:00Z'),
    new Map(),
    /consent/,
    new (class LegacyConsentRecord {})(),
    {purpose: ''},
    {purpose: null},
    {purpose: ' read'},
    {processing_zones: 'local'},
    {processing_zones: null},
    {processing_zones: ['local', 1]},
    {destinations: 'app'},
    {destinations: null},
    {destinations: ['app', {}]},
    {revoked: 'false'},
  ]) {
    const result = evaluateConsent(consent);
    assert.equal(result.outcome, PrivacyDecision.DENY);
    assert.equal(result.reason_code, 'CONSENT_INVALID');
    assert.deepEqual(result.permitted_operations, []);
    assert.equal(result.capability_token_reference, null);
  }
});

test('inherited legacy consent authority fields fail closed', () => {
  const inheritedConstraints = Object.create({
    purpose: 'read',
    processing_zones: ['local'],
    destinations: ['app']
  });
  let result = evaluateConsent(inheritedConstraints);
  assert.equal(result.outcome, PrivacyDecision.DENY);
  assert.equal(result.reason_code, 'CONSENT_INVALID');

  const inheritedExpiry = Object.create({expires_at: '2099-01-01T00:00:00Z'});
  Object.assign(inheritedExpiry, {
    purpose: 'read',
    processing_zones: ['local'],
    destinations: ['app']
  });
  result = evaluateConsent(inheritedExpiry);
  assert.equal(result.outcome, PrivacyDecision.DENY);
  assert.equal(result.reason_code, 'CONSENT_INVALID');

  const inheritedRevocation = Object.create({revoked: false});
  Object.assign(inheritedRevocation, {
    purpose: 'read',
    processing_zones: ['local'],
    destinations: ['app']
  });
  result = evaluateConsent(inheritedRevocation);
  assert.equal(result.outcome, PrivacyDecision.DENY);
  assert.equal(result.reason_code, 'CONSENT_INVALID');
});

test('malformed consent expiry never authorizes a request', () => {
  for (const expiry of [
    'invalid',
    '',
    ' ',
    ' 2099-01-01T00:00:00Z',
    '2099-01-01T00:00:00',
    '999999-01-01T00:00:00Z',
    0,
    false,
    true,
    [],
    {},
    ['2099-01-01'],
  ]) {
    const result = evaluate(expiry);
    assert.equal(result.outcome, PrivacyDecision.DENY);
    assert.equal(result.reason_code, 'CONSENT_EXPIRED');
    assert.deepEqual(result.permitted_operations, []);
    assert.equal(result.capability_token_reference, null);
  }
});

test('expired consent is denied and valid canonical future consent remains usable', () => {
  assert.equal(evaluate(new Date(Date.now() - 60000).toISOString()).outcome, PrivacyDecision.DENY);
  assert.equal(evaluate(new Date(Date.now() + 3600000).toISOString()).outcome, PrivacyDecision.ALLOW);
  assert.equal(evaluate('2099-01-01T05:30:00+05:30').outcome, PrivacyDecision.ALLOW);
});

test('absent optional expiry preserves the existing consent contract', () => {
  for (const expiry of [undefined, null]) assert.equal(evaluate(expiry).outcome, PrivacyDecision.ALLOW);
});
