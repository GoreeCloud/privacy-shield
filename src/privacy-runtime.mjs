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

/**
 * Build the privacy authorities that must share one durable state image.
 *
 * Reusing one FilePrivacyStateStore is intentional: separate file-store
 * instances backed by the same path can race and overwrite namespaces because
 * each instance owns an in-memory snapshot. A production process should create
 * this runtime once and share the returned authorities.
 *
 * This is a single-process/single-host durable runtime primitive. It does not
 * claim distributed locking, multi-host consensus, or production acceptance.
 */
export function createDurablePrivacyRuntime({
  state_file,
  capability_keys,
  initial_consents = [],
} = {}) {
  const store = new FilePrivacyStateStore(requireStateFile(state_file));
  const consent = new ConsentAuthority(initial_consents, { store });
  const capabilities = new PrivacyCapabilityAuthority(capability_keys, { store });
  const evidence = new PrivacyEvidenceLedger({ store });
  const policies = new PrivacyPolicyStore({ store });

  return Object.freeze({
    store,
    consent,
    capabilities,
    evidence,
    policies,
  });
}
