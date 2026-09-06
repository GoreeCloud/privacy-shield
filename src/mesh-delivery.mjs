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

/**
 * Deliver one minimized Privacy Shield evidence envelope to GoreeCloud Mesh.
 *
 * Credential issuance and validation remain owned by GoreeCloud Identity. A
 * production caller should provide `credentialProvider`, which is invoked for
 * each delivery so this client does not own or persist a long-lived service
 * credential. Direct `bearerToken` remains available for bounded tests and
 * transitional callers. The credential must identify service `privacy-shield`
 * with `mesh.evidence.write` scope; GoreeCloud Mesh validates those claims.
 */
export async function deliverPrivacyMeshEvidence({
  envelope,
  meshBaseUrl,
  bearerToken,
  credentialProvider,
  fetchImpl = globalThis.fetch,
  signal,
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
  return {
    evidence_id: delivered.id,
    replayed: payload.replayed === true,
    accepted_at: payload.accepted_at ?? null,
    producer_service_id: payload.producer_service_id,
  };
}
