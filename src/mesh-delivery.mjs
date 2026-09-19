function meshEndpoint(meshBaseUrl) {
  const raw = String(meshBaseUrl ?? "").trim().replace(/\/+$/, "");
  if (!raw) throw new Error("Mesh base URL is required");
  const url = new URL(raw);
  if (url.username || url.password) throw new Error("Mesh base URL must not contain user information");
  if (url.search || url.hash) throw new Error("Mesh base URL must not contain query or fragment components");
  const loopback = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("Mesh evidence delivery requires HTTPS except for loopback development");
  }
  return `${raw}/v1/evidence/envelopes`;
}

async function identityCredential({ bearerToken, credentialProvider }) {
  if (bearerToken != null && credentialProvider != null) {
    throw new Error("Provide either bearerToken or credentialProvider, not both");
  }
  let credential = bearerToken;
  if (credentialProvider != null) {
    if (typeof credentialProvider !== "function") {
      throw new Error("GoreeCloud Identity credential provider must be a function");
    }
    try {
      credential = await credentialProvider({
        service_id: "privacy-shield",
        audience: "goreecloud-mesh",
        scopes: Object.freeze(["mesh.evidence.write"]),
      });
    } catch {
      // Provider errors are deliberately not chained because an upstream error
      // could contain bearer material and later be written to application logs.
      throw new Error("GoreeCloud Identity credential acquisition failed");
    }
  }

  const token = typeof credential === "string" ? credential.trim() : "";
  if (!token) throw new Error("GoreeCloud Identity bearer credential is required");
  if (token.length > 16_384) throw new Error("GoreeCloud Identity bearer credential is oversized");
  if (/\r|\n/.test(token)) throw new Error("GoreeCloud Identity bearer credential is malformed");
  return token;
}

function meshRejectionReason(payload) {
  const code = typeof payload?.error_code === "string" ? payload.error_code.trim() : "";
  if (code && code.length <= 80 && /^[A-Za-z0-9._-]+$/.test(code)) {
    return ` (${code})`;
  }
  return "";
}

function validateIdentityReceipt(payload, expected) {
  if (!expected) return null;
  if (payload?.authority_transfer !== false) {
    throw new Error("Mesh authenticated delivery receipt must preserve authority_transfer false");
  }
  const identity = payload?.authenticated_identity;
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    throw new Error("Mesh authenticated delivery receipt is missing identity binding");
  }
  const allowed = new Set(["credential_id", "service_id", "audience", "scopes", "trust_verified"]);
  for (const key of Object.keys(identity)) {
    if (!allowed.has(key)) throw new Error(`Mesh authenticated identity receipt contains unsupported field: ${key}`);
  }
  if (Object.keys(identity).length !== allowed.size) {
    throw new Error("Mesh authenticated identity receipt is incomplete");
  }
  if (identity.credential_id !== expected.credential_id) throw new Error("Mesh receipt credential identity mismatch");
  if (identity.service_id !== expected.service_id) throw new Error("Mesh receipt service identity mismatch");
  if (identity.audience !== expected.audience) throw new Error("Mesh receipt audience mismatch");
  if (!Array.isArray(identity.scopes) || identity.scopes.length !== 1 || identity.scopes[0] !== expected.scopes[0]) {
    throw new Error("Mesh receipt scope binding mismatch");
  }
  if (identity.trust_verified !== true) throw new Error("Mesh receipt did not verify Identity trust");
  return {
    credential_id: expected.credential_id,
    service_id: expected.service_id,
    audience: expected.audience,
    scopes: Object.freeze([...expected.scopes]),
    trust_verified: true,
  };
}

/**
 * Deliver one minimized Privacy Shield evidence envelope to GoreeCloud Mesh.
 *
 * Credential issuance and validation remain owned by GoreeCloud Identity. A
 * production caller should use the FR-012 identity-authenticated wrapper in
 * `mesh-identity-delivery.mjs`, which requires bounded credential attestation
 * and Mesh acceptance binding. Direct `credentialProvider`/`bearerToken` here
 * remain compatibility paths and are not sufficient for FR-012 qualification.
 */
export async function deliverPrivacyMeshEvidence({
  envelope,
  meshBaseUrl,
  bearerToken,
  credentialProvider,
  fetchImpl = globalThis.fetch,
  signal,
  identityReceiptExpectation = null,
} = {}) {
  if (!envelope || typeof envelope !== "object") throw new Error("envelope is required");
  if (envelope?.producer?.system !== "privacy-shield") {
    throw new Error("Privacy Shield delivery only accepts privacy-shield envelopes");
  }
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");

  const endpoint = meshEndpoint(meshBaseUrl);
  const token = await identityCredential({ bearerToken, credentialProvider });
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "goreecloud-privacy-shield/mesh-evidence",
      },
      body: JSON.stringify(envelope),
      signal,
    });
  } catch {
    // Do not chain transport failures because third-party fetch wrappers can
    // include request headers in their error objects.
    throw new Error("Mesh evidence delivery failed before acceptance");
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Mesh evidence delivery returned invalid JSON with HTTP ${response.status}`);
  }
  if (!response.ok || ![200, 201].includes(response.status)) {
    // Do not echo arbitrary remote error text: a compromised or misconfigured
    // peer could reflect Authorization or other sensitive request material.
    throw new Error(
      `Mesh evidence delivery failed with HTTP ${response.status}${meshRejectionReason(payload)}`,
    );
  }

  const delivered = payload?.envelope ?? {};
  if (delivered.id !== envelope.id) throw new Error("Mesh delivery receipt did not bind to the submitted evidence id");
  if (payload?.producer_service_id !== "privacy-shield") {
    throw new Error("Mesh delivery receipt did not bind to Privacy Shield service identity");
  }
  const authenticatedIdentity = validateIdentityReceipt(payload, identityReceiptExpectation);
  return {
    evidence_id: delivered.id,
    replayed: payload.replayed === true,
    accepted_at: payload.accepted_at ?? null,
    producer_service_id: payload.producer_service_id,
    ...(authenticatedIdentity ? { authenticated_identity: authenticatedIdentity, authority_transfer: false } : {}),
  };
}
