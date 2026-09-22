// Bounded GoreeCloud Observability v1 signal construction for Privacy Shield.
//
// This module constructs contract-shaped operational evidence only. It does not
// publish telemetry, authenticate a producer, retain telemetry, or establish
// monitoring/production acceptance.

export const OBSERVABILITY_CONTRACT_REPOSITORY = 'GoreeCloud/observability';
export const OBSERVABILITY_CONTRACT_REVISION = 'a7f6a65f442d3e517baddbe7b6ce7c250d142c8c';
export const OBSERVABILITY_OPERATIONAL_SIGNAL_CONTRACT_ID =
  'https://goreecloud.com/contracts/observability/operational-signal/v1';

export const OBSERVABILITY_STATES = Object.freeze([
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

const STATE_SET = new Set(OBSERVABILITY_STATES);
const MIN_TTL_SECONDS = 1;
const MAX_TTL_SECONDS = 86400;
const SENSITIVE_ATTRIBUTE_TOKENS = [
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
  'email',
  'phone',
  'address',
  'ip_address',
  'user_id',
];

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function requireTimestamp(value, field) {
  const text = requireNonEmptyString(value, field);
  if (Number.isNaN(Date.parse(text))) {
    throw new TypeError(`${field} must be an ISO-8601-compatible timestamp`);
  }
  return text;
}

function normalizedKey(key) {
  return key.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
}

function looksSensitive(key) {
  const normalized = normalizedKey(key);
  return SENSITIVE_ATTRIBUTE_TOKENS.some((token) => normalized.includes(token));
}

function sanitizeJson(value, path) {
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
    return value.map((item, index) => sanitizeJson(item, `${path}[${index}]`));
  }
  if (typeof value === 'object') {
    const sanitized = {};
    for (const [rawKey, rawValue] of Object.entries(value)) {
      const key = requireNonEmptyString(rawKey, `${path} key`);
      if (looksSensitive(key)) {
        throw new TypeError(`${path}.${key} is not allowed in Observability attributes`);
      }
      sanitized[key] = sanitizeJson(rawValue, `${path}.${key}`);
    }
    return sanitized;
  }
  throw new TypeError(`${path} contains a non-JSON-safe value`);
}

export function buildOperationalSignal({
  signalId,
  componentId = 'goreecloud-privacy-shield',
  source,
  signalType,
  state,
  observedAt,
  collectedAt,
  ttlSeconds,
  correlationId = null,
  attributes = {},
  collectionGaps = [],
}) {
  const normalizedState = requireNonEmptyString(state, 'state');
  if (!STATE_SET.has(normalizedState)) {
    throw new TypeError(`unsupported Observability state: ${normalizedState}`);
  }
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < MIN_TTL_SECONDS || ttlSeconds > MAX_TTL_SECONDS) {
    throw new TypeError('ttlSeconds must be an integer from 1 through 86400');
  }
  if (correlationId !== null && (typeof correlationId !== 'string' || correlationId.trim() === '')) {
    throw new TypeError('correlationId must be null or a non-empty string');
  }
  if (attributes === null || Array.isArray(attributes) || typeof attributes !== 'object') {
    throw new TypeError('attributes must be an object');
  }
  if (!Array.isArray(collectionGaps) || collectionGaps.some((item) => typeof item !== 'string' || item.trim() === '')) {
    throw new TypeError('collectionGaps must be an array of non-empty strings');
  }

  return {
    signal_id: requireNonEmptyString(signalId, 'signalId'),
    component_id: requireNonEmptyString(componentId, 'componentId'),
    source: requireNonEmptyString(source, 'source'),
    signal_type: requireNonEmptyString(signalType, 'signalType'),
    state: normalizedState,
    observed_at: requireTimestamp(observedAt, 'observedAt'),
    collected_at: requireTimestamp(collectedAt, 'collectedAt'),
    ttl_seconds: ttlSeconds,
    correlation_id: correlationId === null ? null : correlationId.trim(),
    attributes: sanitizeJson(attributes, 'attributes'),
    collection_gaps: collectionGaps.map((item) => item.trim()),
  };
}
