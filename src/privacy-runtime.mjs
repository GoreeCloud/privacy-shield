import path from "node:path";

import { PrivacyCapabilityAuthority } from "./capability-token.mjs";
import { ConsentAuthority } from "./consent-authority.mjs";
import { PrivacyEvidenceLedger } from "./privacy-evidence.mjs";
import { PrivacyPolicyStore } from "./privacy-policy-store.mjs";
import { FilePrivacyStateStore } from "./privacy-state-store.mjs";

function requireStateFile(stateFile) {
  const value = String(stateFile ?? "").trim();
  if (!value) throw new TypeError("Durable Privacy Shield runtime requires state_file");
  return path.resolve(value);
}

function requireStateStore(store) {
  if (!store || typeof store !== "object") {
    throw new TypeError("Privacy Shield runtime requires an injected state store");
  }
  for (const method of ["get", "set", "delete", "list"]) {
    if (typeof store[method] !== "function") {
      throw new TypeError(`Privacy Shield state store must implement ${method}()`);
    }
  }
  return store;
}

/**
 * Build one Privacy Shield authority set over an explicitly injected state store.
 *
 * The caller owns the store's durability, locking, replication, availability,
 * backup, and recovery guarantees. Sharing one store instance is mandatory so
 * consent, policy, capability replay/revocation, and evidence state cannot drift
 * across independently cached namespace snapshots.
 */
export function createPrivacyRuntime({
  store,
  capability_keys,
  initial_consents = [],
} = {}) {
  const stateStore = requireStateStore(store);
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
  });
}

/**
 * Build the single-host file-backed Privacy Shield runtime.
 *
 * Reusing one FilePrivacyStateStore is intentional: separate file-store
 * instances backed by the same path can race and overwrite namespaces because
 * each instance owns an in-memory snapshot. This helper is deliberately not a
 * production distributed-state provider. A production deployment must inject a
 * separately accepted production-grade store through createPrivacyRuntime().
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
  });
}
