// Bounded GoreeCloud Policy v1 contract helpers for Privacy Shield.
//
// These helpers construct evaluation requests and validate returned Policy
// decision evidence only. They do not call a Policy runtime, execute obligations,
// mutate Privacy Shield state, or turn an `allow` decision into privacy authority.

export const POLICY_CONTRACT_REPOSITORY = 'GoreeCloud/policy';
export const POLICY_CONTRACT_REVISION = '46071886da37a6566b69cc923005eef64cce2bcc';
export const POLICY_EVALUATION_REQUEST_CONTRACT_ID =
  'https://goreecloud.com/contracts/policy/evaluation-request/v1';
export const POLICY_DECISION_CONTRACT_ID =
  'https://goreecloud.com/contracts/policy/decision/v1';

export const POLICY_DECISIONS = Object.freeze([
  'allow',
  'deny',
  'conditional',
  'defer',
  'indeterminate',
  'error',
]);

const DECISION_SET = new Set(POLICY_DECISIONS);
const REQUEST_FIELDS = Object.freeze([
  'policy_id',
  'policy_version',
  'authority',
  'subject',
  'resource',
  'action',
]);
const DECISION_FIELDS = Object.freeze([
  'decision',
  'policy_id',
  'policy_version',
  'authority',
  'subject',
  'resource',
  'action',
  'reason',
  'matched_rule_ids',
  'obligations',
  'evaluated_at',
  'fresh',
]);
const SENSITIVE_CONTEXT_TOKENS = [
  'api_key',
  'apikey',
  'authorization',
  'cookie',
  'credential',
  'password',
  'passwd',
  'private_key',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'content',
  'payload',
  'message',
  'query',
  'body',
  'email',
  'phone',
  'address',
  'ip_address',
];

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function normalizedKey(key) {
  return key.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
}

function looksSensitive(key) {
  const normalized = normalizedKey(key);
  return SENSITIVE_CONTEXT_TOKENS.some((token) => normalized.includes(token));
}

function sanitizeContextValue(value, path) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must contain only finite JSON numbers`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeContextValue(item, `${path}[${index}]`));
  }
  if (typeof value === 'object') {
    const sanitized = {};
    for (const [rawKey, rawValue] of Object.entries(value)) {
      const key = requireNonEmptyString(rawKey, `${path} key`);
      if (looksSensitive(key)) {
        throw new TypeError(`${path}.${key} is not allowed in Policy context`);
      }
      sanitized[key] = sanitizeContextValue(rawValue, `${path}.${key}`);
    }
    return sanitized;
  }
  throw new TypeError(`${path} contains a non-JSON-safe value`);
}

function validateStringArray(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array of strings`);
  }
  return value.map((item) => requireNonEmptyString(item, `${field} item`));
}

function validateTimestamp(value, field) {
  const text = requireNonEmptyString(value, field);
  const hasExplicitZone = /(?:Z|[+-]\d{2}:\d{2})$/u.test(text);
  if (!hasExplicitZone || Number.isNaN(Date.parse(text))) {
    throw new TypeError(`${field} must be a timezone-qualified timestamp`);
  }
  return text;
}

export function buildPolicyEvaluationRequest({
  policyId,
  policyVersion,
  authority,
  subject,
  resource,
  action,
  context,
}) {
  const request = {
    policy_id: requireNonEmptyString(policyId, 'policyId'),
    policy_version: requireNonEmptyString(policyVersion, 'policyVersion'),
    authority: requireNonEmptyString(authority, 'authority'),
    subject: requireNonEmptyString(subject, 'subject'),
    resource: requireNonEmptyString(resource, 'resource'),
    action: requireNonEmptyString(action, 'action'),
  };

  if (context !== undefined) {
    if (context === null || Array.isArray(context) || typeof context !== 'object') {
      throw new TypeError('context must be an object when provided');
    }
    request.context = sanitizeContextValue(context, 'context');
  }

  return request;
}

export function validatePolicyDecisionEvidence(decision, { expectedRequest } = {}) {
  if (decision === null || Array.isArray(decision) || typeof decision !== 'object') {
    throw new TypeError('decision must be an object');
  }

  const actualFields = Object.keys(decision).sort();
  const requiredFields = [...DECISION_FIELDS].sort();
  if (
    actualFields.length !== requiredFields.length
    || actualFields.some((field, index) => field !== requiredFields[index])
  ) {
    throw new TypeError('decision must contain exactly the Policy v1 decision fields');
  }

  const decisionValue = requireNonEmptyString(decision.decision, 'decision');
  if (!DECISION_SET.has(decisionValue)) {
    throw new TypeError(`unsupported Policy decision: ${decisionValue}`);
  }

  const validated = {
    decision: decisionValue,
    policy_id: requireNonEmptyString(decision.policy_id, 'policy_id'),
    policy_version: requireNonEmptyString(decision.policy_version, 'policy_version'),
    authority: requireNonEmptyString(decision.authority, 'authority'),
    subject: requireNonEmptyString(decision.subject, 'subject'),
    resource: requireNonEmptyString(decision.resource, 'resource'),
    action: requireNonEmptyString(decision.action, 'action'),
    reason: requireNonEmptyString(decision.reason, 'reason'),
    matched_rule_ids: validateStringArray(decision.matched_rule_ids, 'matched_rule_ids'),
    obligations: validateStringArray(decision.obligations, 'obligations'),
    evaluated_at: validateTimestamp(decision.evaluated_at, 'evaluated_at'),
  };

  if (typeof decision.fresh !== 'boolean') {
    throw new TypeError('fresh must be a boolean');
  }
  validated.fresh = decision.fresh;

  if (expectedRequest !== undefined) {
    if (expectedRequest === null || Array.isArray(expectedRequest) || typeof expectedRequest !== 'object') {
      throw new TypeError('expectedRequest must be an object');
    }
    for (const field of REQUEST_FIELDS) {
      const expected = requireNonEmptyString(expectedRequest[field], `expectedRequest.${field}`);
      if (validated[field] !== expected) {
        throw new TypeError(`Policy decision provenance mismatch for ${field}`);
      }
    }
  }

  return validated;
}
