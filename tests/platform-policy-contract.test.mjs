import assert from 'node:assert/strict';
import test from 'node:test';

import {
  POLICY_CONTRACT_REVISION,
  POLICY_DECISION_CONTRACT_ID,
  POLICY_DECISIONS,
  POLICY_EVALUATION_REQUEST_CONTRACT_ID,
  buildPolicyEvaluationRequest,
  validatePolicyDecisionEvidence,
} from '../src/platform-policy-contract.mjs';

function validRequest() {
  return buildPolicyEvaluationRequest({
    policyId: 'privacy-shield.shared-policy',
    policyVersion: '1',
    authority: 'goreecloud-policy',
    subject: 'principal:opaque-001',
    resource: 'privacy-capability:opaque-001',
    action: 'evaluate',
    context: { operation_class: 'privacy-evaluation', external_disclosure: false },
  });
}

function validDecision(overrides = {}) {
  return {
    decision: 'conditional',
    policy_id: 'privacy-shield.shared-policy',
    policy_version: '1',
    authority: 'goreecloud-policy',
    subject: 'principal:opaque-001',
    resource: 'privacy-capability:opaque-001',
    action: 'evaluate',
    reason: 'Shared policy adds a non-authorizing constraint.',
    matched_rule_ids: ['shared-policy-001'],
    obligations: ['do-not-expand-privacy-authority'],
    evaluated_at: '2026-09-22T22:30:00Z',
    fresh: true,
    ...overrides,
  };
}

test('pins the authoritative GoreeCloud Policy v1 contracts', () => {
  assert.equal(POLICY_CONTRACT_REVISION, '46071886da37a6566b69cc923005eef64cce2bcc');
  assert.equal(POLICY_EVALUATION_REQUEST_CONTRACT_ID, 'https://goreecloud.com/contracts/policy/evaluation-request/v1');
  assert.equal(POLICY_DECISION_CONTRACT_ID, 'https://goreecloud.com/contracts/policy/decision/v1');
});

test('preserves the complete Policy decision vocabulary', () => {
  assert.deepEqual(POLICY_DECISIONS, [
    'allow',
    'deny',
    'conditional',
    'defer',
    'indeterminate',
    'error',
  ]);
});

test('constructs the exact Policy v1 request shape', () => {
  const request = validRequest();
  assert.deepEqual(Object.keys(request).sort(), [
    'action',
    'authority',
    'context',
    'policy_id',
    'policy_version',
    'resource',
    'subject',
  ]);
  assert.equal(request.context.external_disclosure, false);
});

test('rejects secrets and private content recursively from Policy context', () => {
  const base = {
    policyId: 'p',
    policyVersion: '1',
    authority: 'goreecloud-policy',
    subject: 'opaque-subject',
    resource: 'opaque-resource',
    action: 'evaluate',
  };
  assert.throws(() => buildPolicyEvaluationRequest({ ...base, context: { access_token: 'secret' } }), /not allowed/);
  assert.throws(() => buildPolicyEvaluationRequest({ ...base, context: { nested: { request_body: 'private' } } }), /not allowed/);
  assert.throws(() => buildPolicyEvaluationRequest({ ...base, context: { message_content: 'private' } }), /not allowed/);
});

test('validates exact Policy decision evidence and expected provenance', () => {
  const request = validRequest();
  const decision = validatePolicyDecisionEvidence(validDecision(), { expectedRequest: request });
  assert.equal(decision.decision, 'conditional');
  assert.equal(decision.fresh, true);
});

test('a valid allow remains decision evidence only', () => {
  const request = validRequest();
  const decision = validatePolicyDecisionEvidence(validDecision({ decision: 'allow', obligations: [] }), { expectedRequest: request });
  assert.equal(decision.decision, 'allow');
  assert.equal(typeof decision.authorized, 'undefined');
  assert.equal(typeof decision.execute, 'undefined');
  assert.equal(typeof decision.consent, 'undefined');
});

test('fails closed on provenance mismatch', () => {
  const request = validRequest();
  assert.throws(
    () => validatePolicyDecisionEvidence(validDecision({ subject: 'different-subject' }), { expectedRequest: request }),
    /provenance mismatch/,
  );
});

test('rejects unsupported decisions, fields, malformed arrays, freshness, and timestamps', () => {
  assert.throws(() => validatePolicyDecisionEvidence(validDecision({ decision: 'permit' })), /unsupported Policy decision/);
  assert.throws(() => validatePolicyDecisionEvidence({ ...validDecision(), extra: true }), /exactly the Policy v1 decision fields/);
  assert.throws(() => validatePolicyDecisionEvidence(validDecision({ obligations: 'none' })), /array of strings/);
  assert.throws(() => validatePolicyDecisionEvidence(validDecision({ fresh: 'yes' })), /fresh must be a boolean/);
  assert.throws(() => validatePolicyDecisionEvidence(validDecision({ evaluated_at: '2026-09-22T22:30:00' })), /timezone-qualified/);
});
