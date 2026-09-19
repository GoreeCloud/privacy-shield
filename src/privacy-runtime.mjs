import path from "node:path";

import { PrivacyCapabilityAuthority } from "./capability-token.mjs";
import { ConsentAuthority } from "./consent-authority.mjs";
import { PrivacyEvidenceLedger } from "./privacy-evidence.mjs";
import { PrivacyPolicyStore } from "./privacy-policy-store.mjs";
import { requireSigningKeyProviderAcceptance } from "./signing-key-acceptance.mjs";\nimport { requireStateProviderAcceptance } from "./state-provider-acceptance.mjs";
import {
  FilePrivacyStateStore,
  PRIVACY_STATE_PROVIDER_CONTRACT,
} from "./privacy-state-store.mjs";

const PRODUCTION_STATE_CAPABILITIES = Object.freeze([
  "durable",
  "restart_recovery",
  "atomic_transactions",
  "multi_writer_serializable",
  "distributed",
  "fail_closed_on_conflict",
]);

function requireStateFile(stateFile) {
  const value = String(stateFile ?? "").trim();
  if (!value) throw new TypeError("Durable Privacy Shield runtime requires state_file");
  return path.resolve(value);
}

function requireStateStore(store, { production = false } = {}) {
  if (!store || typeof store !== "object") {
    throw new TypeError("Privacy Shield runtime requires an injected state store");
  }
  for (const method of ["get", "set", "delete", "list"]) {
    if (typeof store[method] !== "function") {
      throw new TypeError(`Privacy Shield state store must implement ${method}()`);
    }
  }

  if (!production) return store;

  if (typeof store.transaction !== "function") {
    throw new TypeError("Production Privacy Shield state provider must implement transaction()");
  }
  if (typeof store.stateProviderCapabilities !== "function") {
    throw new TypeError("Production Privacy Shield state provider must declare stateProviderCapabilities()");
  }
  const capabilities = store.stateProviderCapabilities();
  if (!capabilities || typeof capabilities !== "object" || Array.isArray(capabilities)) {
    throw new TypeError("Production Privacy Shield state provider capabilities must be an object");
  }
  if (capabilities.contract !== PRIVACY_STATE_PROVIDER_CONTRACT) {
    throw new Error("PRIVACY_STATE_PROVIDER_CONTRACT_MISMATCH");
  }
  for (const capability of PRODUCTION_STATE_CAPABILITIES) {
    if (capabilities[capability] !== true) {
      throw new Error(`PRIVACY_STATE_PROVIDER_CAPABILITY_REQUIRED:${capability}`);
    }
  }
  return store;
}

function signingConfiguration({ capability_keys, capability_key_provider, production }) {
  if (capability_keys !== undefined && capability_key_provider !== undefined) {
    throw new TypeError("Configure capability_keys or capability_key_provider, not both");
  }
  if (production && capability_keys !== undefined) {
    throw new Error("PRODUCTION_CAPABILITY_KEY_PROVIDER_REQUIRED");
  }
  return capability_key_provider ?? capability_keys;
}

/**
 * Build one Privacy Shield authority set over explicitly injected authority
 * dependencies.
 *
 * Sharing one state store instance is mandatory so consent, policy, capability
 * replay/revocation, and evidence state cannot drift across independently cached
 * namespace snapshots. `production: true` is fail closed for both durable state
 * and capability-signing custody: the state provider must expose the V1 production
 * state profile and a fresh exact-provider/source-tree/environment/topology
 * acceptance record; capability signing must use an independently
 * production-eligible opaque key provider with a fresh exact-provider/deployment
 * acceptance record. Structural declarations alone are insufficient.
 */
export function createPrivacyRuntime({
  store,
  state_provider_acceptance,
  state_provider_environment,
  state_provider_topology_id,
  runtime_tree_sha,
  capability_keys,
  capability_key_provider,
  capability_key_acceptance,
  capability_key_deployment_id,
  runtime_revision,
  initial_consents = [],
  production = false,
} = {}) {
  const stateStore = requireStateStore(store, { production });
  const stateAcceptance = production
    ? requireStateProviderAcceptance(stateStore, {
        record: state_provider_acceptance,
        runtime_revision,
        runtime_tree_sha,
        environment: state_provider_environment,
        topology_id: state_provider_topology_id,
      })
    : null;

  const signing = signingConfiguration({
    capability_keys,
    capability_key_provider,
    production,
  });

  const consent = new ConsentAuthority(initial_consents, { store: stateStore });
  const capabilities = new PrivacyCapabilityAuthority(signing, {
    store: stateStore,
    production,
  });

  const signingAcceptance = production
    ? requireSigningKeyProviderAcceptance(capability_key_provider, {
        record: capability_key_acceptance,
        runtime_revision,
        deployment_id: capability_key_deployment_id,
      })
    : null;

  const evidence = new PrivacyEvidenceLedger({ store: stateStore });
  const policies = new PrivacyPolicyStore({ store: stateStore });

  return Object.freeze({
    store: stateStore,
    consent,
    capabilities,
    evidence,
    policies,
    state_acceptance: stateAcceptance,
    signing_acceptance: signingAcceptance,
    production,
  });
}

/**
 * Build the single-host file-backed Privacy Shield runtime.
 *
 * Reusing one FilePrivacyStateStore is intentional: separate file-store
 * instances backed by the same path fail closed on stale writes rather than
 * overwriting namespaces. This helper is deliberately not a production
 * distributed-state provider. A production deployment must inject separately
 * accepted state and signing providers through createPrivacyRuntime().
 */
export function createDurablePrivacyRuntime({
  state_file,
  capability_keys,
  capability_key_provider,
  initial_consents = [],
  production = false,
} = {}) {
  if (production === true) {
    throw new Error(
      "FilePrivacyStateStore is single-host only and cannot be selected as a production Privacy Shield state provider",
    );
  }
  const store = new FilePrivacyStateStore(requireStateFile(state_file));
  return createPrivacyRuntime({
    store,
    capability_keys,
    capability_key_provider,
    initial_consents,
    production: false,
  });
}
