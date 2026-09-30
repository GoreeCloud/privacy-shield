// Privacy-minimized GoreeCloud Manager status producer for Privacy Shield.
//
// This source constructs the shared Privacy Shield status contract only. It does
// not publish the document, approve a runtime, grant privacy authority, or create
// production acceptance.

export const MANAGER_STATUS_SCHEMA_VERSION = 1;
export const MANAGER_STATUS_ADAPTER_ID = 'privacy-shield-platform-status';
export const MANAGER_STATUS_RUNTIME_AUTHORITY = 'GoreeCloud/privacy-shield';
export const MANAGER_STATUS_PRODUCT = 'GoreeCloud Privacy Shield';

const STATUS_STATES = new Set(['development', 'partial', 'attention', 'unavailable']);
const CAPABILITY_STATES = new Set(['inactive', 'pending-acceptance', 'unavailable']);
const CAPABILITY_IDS = new Set([
  'content-blocking',
  'tracking-resistance',
  'url-cleaning',
  'dns-privacy',
  'network-privacy',
  'telemetry-minimization',
  'data-minimization',
  'retention-controls',
  'deletion-controls',
  'portable-export',
  'privacy-status',
  'user-visible-exceptions',
]);
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/;

function text(value, name, maximum = 240) {
  if (
    typeof value !== 'string'
    || !value
    || value !== value.trim()
    || value.length > maximum
    || CONTROL.test(value)
  ) {
    throw new TypeError(`${name} must be bounded canonical text`);
  }
  return value;
}

function timestamp(value, name) {
  text(value, name, 64);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(value) || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${name} must be a timezone-qualified timestamp`);
  }
  return value;
}

function capability(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`capabilities[${index}] must be an object`);
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== 'id' || keys[1] !== 'state') {
    throw new TypeError(`capabilities[${index}] must contain exactly id and state`);
  }
  const id = text(value.id, `capabilities[${index}].id`, 120);
  if (!CAPABILITY_IDS.has(id)) {
    throw new TypeError(`unsupported Privacy Shield capability: ${id}`);
  }
  const state = text(value.state, `capabilities[${index}].state`, 40);
  if (!CAPABILITY_STATES.has(state)) {
    throw new TypeError(
      `capabilities[${index}].state must remain inactive, pending-acceptance, or unavailable until separate runtime acceptance`,
    );
  }
  return Object.freeze({ id, state });
}

export function buildManagerStatusRecord({
  generatedAt,
  state = 'development',
  capabilities,
  validUntil,
} = {}) {
  const generated = timestamp(generatedAt, 'generatedAt');
  const normalizedState = text(state, 'state', 40);
  if (!STATUS_STATES.has(normalizedState)) {
    throw new TypeError(
      'Manager source status may only report development, partial, attention, or unavailable; protected requires separate accepted runtime evidence',
    );
  }
  if (!Array.isArray(capabilities) || capabilities.length < 1 || capabilities.length > CAPABILITY_IDS.size) {
    throw new TypeError('capabilities must contain 1-12 bounded Privacy Shield capability states');
  }
  const normalizedCapabilities = capabilities.map(capability);
  const ids = normalizedCapabilities.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError('capability ids must be unique');
  }

  const record = {
    schema_version: MANAGER_STATUS_SCHEMA_VERSION,
    producer: {
      adapter_id: MANAGER_STATUS_ADAPTER_ID,
      product: MANAGER_STATUS_PRODUCT,
      runtime_authority: MANAGER_STATUS_RUNTIME_AUTHORITY,
      adapter_contract_version: 1,
    },
    generated_at: generated,
    state: normalizedState,
    capabilities: normalizedCapabilities,
    privacy: {
      raw_private_activity_included: false,
      contains_credentials: false,
      contains_identifiers: false,
    },
    acceptance: {
      runtime_acceptance_required: true,
      production_approved: false,
    },
  };

  if (validUntil !== undefined) {
    const valid = timestamp(validUntil, 'validUntil');
    if (Date.parse(valid) <= Date.parse(generated)) {
      throw new TypeError('validUntil must be later than generatedAt');
    }
    record.valid_until = valid;
  }

  return Object.freeze(record);
}

export const MANAGER_STATUS_CAPABILITIES = Object.freeze([...CAPABILITY_IDS]);
