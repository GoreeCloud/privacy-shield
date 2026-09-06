import path from "node:path";

import { PrivacyCapabilityAuthority } from "./capability-token.mjs";
import { ConsentAuthority } from "./consent-authority.mjs";
import { PrivacyEvidenceLedger } from "./privacy-evidence.mjs";
import { PrivacyPolicyStore } from "./privacy-policy-store.mjs";
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

/**
 * Build one Privacy Shield authority set over an explicitly injected state store.
 *
 * Sharing one store instance is mandatory so consent, policy, capability
 * replay/revocation, and evidence state cannot drift across independently cached
 * namespace snapshots. `production: true` is a fail-closed structural gate: it
 * requires the provider to expose the V1 production state capability profile and
 * a synchronous transaction boundary. That declaration is necessary but not
 * sufficient evidence of production acceptance; the exact provider/deployment
 * still requires independent runtime, failure/recovery, and operational evidence.
 */
export function createPrivacyRuntime({
  store,
  capability_keys,
  initial_consents = [],
  production = false,
} = {}) {
  const stateStore = requireStateStore(store, { production });
  const consent = new ConsentAuthority(initial_consents, { store: stateStore });
  const capabilities = new PrivacyCapabilityAuthority(capability_keys, {
    store: stateStore,
  });
  const evidence = new PrivacyEvidenceLedger({ store: stateStore });
  const policies = new PrivacyPolicyStore({ store: stateStore });

  return Object.freeze({
    store: stateStore,
    consent,
    capabilities,
    evidence,
    policies,
    production,
  });
}

/**
 * Build the single-host file-backed Privacy Shield runtime.
 *
 * Reusing one FilePrivacyStateStore is intentional: separate file-store
 * instances backed by the same path fail closed on stale writes rather than
 * overwriting namespaces. This helper is deliberately not a production
 * distributed-state provider. A production deployment must inject a separately
 * accepted provider through createPrivacyRuntime({ production: true, ... }).
 */
export function createDurablePrivacyRuntime({
  state_file,
  capability_keys,
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
    initial_consents,
    production: false,
  });
}
