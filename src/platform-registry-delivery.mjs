const EXPECTED_SCHEMA = "goreecloud.mesh.platform-record.v1";
const COMPONENT_ID = "goreecloud-privacy-shield";
const REPOSITORY = "GoreeCloud/goreecloud-privacy-shield";
const MAX_RECORD_BYTES = 256 * 1024;

function platformRegistryEndpoint(meshBaseUrl) {
  const raw = String(meshBaseUrl ?? "").trim().replace(/\/+$/, "");
  if (!raw) throw new Error("Mesh base URL is required");
  const url = new URL(raw);
  if (url.username || url.password) throw new Error("Mesh base URL must not contain user information");
  if (url.search || url.hash) throw new Error("Mesh base URL must not contain query or fragment components");
  const loopback = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("Mesh Platform Registry publication requires HTTPS except for loopback development");
  }
  return `${raw}/v1/platform-registry`;
}

function validateRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("platform record is required");
  }
  if (record.schema !== EXPECTED_SCHEMA) {
    throw new Error("unsupported Mesh platform record schema");
  }
  if (record?.component?.id !== COMPONENT_ID) {
    throw new Error("Privacy Shield may publish only its own platform record");
  }
  if (record?.component?.repository !== REPOSITORY || record?.source?.repository !== REPOSITORY) {
    throw new Error("Privacy Shield platform record repository authority mismatch");
  }
  if (record?.source?.authority_transfer !== false) {
    throw new Error("platform record authority_transfer must remain false");
  }
  if (!/^[0-9a-f]{40}$/.test(String(record?.source?.revision ?? ""))) {
    throw new Error("platform record source revision must be an exact lowercase Git revision");
  }

  const encoded = JSON.stringify(record);
  if (Buffer.byteLength(encoded, "utf8") > MAX_RECORD_BYTES) {
    throw new Error("platform record is oversized");
  }
  return encoded;
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
        service_id: COMPONENT_ID,
        audience: "goreecloud-mesh",
        scopes: Object.freeze(["mesh.platform-registry.write"]),
      });
    } catch {
      throw new Error("GoreeCloud Identity credential acquisition failed");
    }
  }

  const token = typeof credential === "string" ? credential.trim() : "";
  if (!token) throw new Error("GoreeCloud Identity bearer credential is required");
  if (token.length > 16_384) throw new Error("GoreeCloud Identity bearer credential is oversized");
  if (/\r|\n/.test(token)) throw new Error("GoreeCloud Identity bearer credential is malformed");
  return token;
}

function rejectionReason(payload) {
  const code = typeof payload?.error_code === "string" ? payload.error_code.trim() : "";
  if (code && code.length <= 80 && /^[A-Za-z0-9._-]+$/.test(code)) return ` (${code})`;
  return "";
}

/**
 * Publish an already-normalized, evidence-backed Privacy Shield platform record.
 *
 * This transport does not compute conformance, reinterpret Privacy Shield facts,
 * or mint credentials. The producer record and canonical evaluator result must
 * already exist before publication. Mesh remains an aggregation/coordination
 * plane and authority_transfer must remain false.
 */
export async function publishPrivacyShieldPlatformRecord({
  record,
  meshBaseUrl,
  bearerToken,
  credentialProvider,
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");
  const body = validateRecord(record);
  const endpoint = platformRegistryEndpoint(meshBaseUrl);
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
        "User-Agent": "goreecloud-privacy-shield/platform-registry",
      },
      body,
      signal,
    });
  } catch {
    throw new Error("Mesh Platform Registry publication failed before acceptance");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Mesh Platform Registry returned invalid JSON with HTTP ${response.status}`);
  }
  if (!response.ok || response.status !== 201) {
    throw new Error(
      `Mesh Platform Registry publication failed with HTTP ${response.status}${rejectionReason(payload)}`,
    );
  }
  if (payload?.producer_service_id !== COMPONENT_ID) {
    throw new Error("Mesh Platform Registry receipt did not bind to Privacy Shield service identity");
  }
  if (payload?.record?.component?.id !== COMPONENT_ID) {
    throw new Error("Mesh Platform Registry receipt did not bind to Privacy Shield component id");
  }
  if (payload?.authority_transfer !== false) {
    throw new Error("Mesh Platform Registry receipt violated the no-authority-transfer boundary");
  }

  return {
    component_id: COMPONENT_ID,
    accepted_at: payload.accepted_at ?? null,
    producer_service_id: payload.producer_service_id,
    authority_transfer: false,
  };
}
