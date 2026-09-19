const TOP_LEVEL_KEYS = new Set([
  "schema_version",
  "producer",
  "generated_at",
  "valid_until",
  "state",
  "capabilities",
  "privacy",
  "acceptance",
]);

const PRODUCER_KEYS = new Set([
  "adapter_id",
  "product",
  "runtime_authority",
  "adapter_contract_version",
]);

const CAPABILITY_KEYS = new Set(["id", "state"]);
const PRIVACY_KEYS = new Set([
  "raw_private_activity_included",
  "contains_credentials",
  "contains_identifiers",
]);
const ACCEPTANCE_KEYS = new Set([
  "runtime_acceptance_required",
  "production_approved",
]);

const STATES = new Set([
  "protected",
  "partial",
  "attention",
  "unavailable",
  "development",
]);
const CAPABILITY_STATES = new Set([
  "active",
  "inactive",
  "pending-acceptance",
  "unavailable",
]);

function require(condition, message) {
  if (!condition) {
    throw new TypeError(message);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireExactKeys(value, allowed, required, label) {
  require(isPlainObject(value), `${label} must be an object`);
  for (const key of Object.keys(value)) {
    require(allowed.has(key), `${label} contains unsupported property: ${key}`);
  }
  for (const key of required) {
    require(Object.hasOwn(value, key), `${label} is missing required property: ${key}`);
  }
}

function parseDateTime(value, label) {
  require(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  require(value.trim() === value, `${label} must not contain surrounding whitespace`);
  require(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value),
    `${label} must be an offset-qualified RFC 3339 date-time`,
  );
  const parsed = Date.parse(value);
  require(Number.isFinite(parsed), `${label} must be a valid date-time`);
  return parsed;
}

export function validatePrivacyShieldStatusRecord(record) {
  requireExactKeys(
    record,
    TOP_LEVEL_KEYS,
    ["schema_version", "producer", "generated_at", "state", "capabilities", "privacy", "acceptance"],
    "status record",
  );
  require(record.schema_version === 1, "unsupported Privacy Shield status schema_version");

  requireExactKeys(
    record.producer,
    PRODUCER_KEYS,
    ["adapter_id", "product", "runtime_authority", "adapter_contract_version"],
    "producer",
  );
  require(
    typeof record.producer.adapter_id === "string" &&
      /^[a-z0-9][a-z0-9-]*$/.test(record.producer.adapter_id),
    "producer.adapter_id is invalid",
  );
  require(
    typeof record.producer.product === "string" && record.producer.product.length > 0,
    "producer.product must be a non-empty string",
  );
  require(
    typeof record.producer.runtime_authority === "string" &&
      /^GoreeCloud\/[A-Za-z0-9._-]+$/.test(record.producer.runtime_authority),
    "producer.runtime_authority is invalid",
  );
  require(
    Number.isInteger(record.producer.adapter_contract_version) &&
      record.producer.adapter_contract_version >= 1,
    "producer.adapter_contract_version must be an integer >= 1",
  );

  const generatedAt = parseDateTime(record.generated_at, "generated_at");
  let validUntil = null;
  if (Object.hasOwn(record, "valid_until")) {
    validUntil = parseDateTime(record.valid_until, "valid_until");
    require(validUntil > generatedAt, "valid_until must be later than generated_at");
  }

  require(STATES.has(record.state), "status record state is unsupported");
  require(Array.isArray(record.capabilities) && record.capabilities.length > 0, "capabilities must be a non-empty array");

  const capabilityIds = new Set();
  for (const [index, capability] of record.capabilities.entries()) {
    requireExactKeys(capability, CAPABILITY_KEYS, ["id", "state"], `capabilities[${index}]`);
    require(typeof capability.id === "string" && capability.id.length > 0, `capabilities[${index}].id must be non-empty`);
    require(!capabilityIds.has(capability.id), `duplicate capability id: ${capability.id}`);
    capabilityIds.add(capability.id);
    require(CAPABILITY_STATES.has(capability.state), `capabilities[${index}].state is unsupported`);
  }

  requireExactKeys(record.privacy, PRIVACY_KEYS, [...PRIVACY_KEYS], "privacy");
  require(record.privacy.raw_private_activity_included === false, "raw private activity must not be included");
  require(record.privacy.contains_credentials === false, "credentials must not be included");
  require(record.privacy.contains_identifiers === false, "identifiers must not be included");

  requireExactKeys(record.acceptance, ACCEPTANCE_KEYS, [...ACCEPTANCE_KEYS], "acceptance");
  require(record.acceptance.runtime_acceptance_required === true, "runtime acceptance boundary must remain required");
  require(typeof record.acceptance.production_approved === "boolean", "production_approved must be boolean");

  if (record.state === "protected" || record.acceptance.production_approved === true) {
    require(validUntil !== null, "protected or production-approved status requires valid_until");
  }

  return record;
}

export function evaluatePrivacyShieldStatusRecord(record, { observedAt } = {}) {
  validatePrivacyShieldStatusRecord(record);
  const observed = parseDateTime(
    observedAt ?? new Date().toISOString(),
    "observedAt",
  );
  const generatedAt = parseDateTime(record.generated_at, "generated_at");
  const validUntil = Object.hasOwn(record, "valid_until")
    ? parseDateTime(record.valid_until, "valid_until")
    : null;

  return Object.freeze({
    valid: true,
    generated_in_future: generatedAt > observed,
    expired: validUntil !== null && observed > validUntil,
    freshness_bounded: validUntil !== null,
  });
}
