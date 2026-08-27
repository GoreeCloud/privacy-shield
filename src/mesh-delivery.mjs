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

/**
 * Deliver one minimized Privacy Shield evidence envelope to GoreeCloud Mesh.
 *
 * Credential issuance and validation remain owned by GoreeCloud Identity. The
 * supplied bearer credential is expected to identify service `privacy-shield`
 * with `mesh.evidence.write` scope. It is never copied into evidence, returned
 * receipts, or persisted by this client.
 */
export async function deliverPrivacyMeshEvidence({
  envelope,
  meshBaseUrl,
  bearerToken,
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  if (!envelope || typeof envelope !== "object") throw new Error("envelope is required");
  if (envelope?.producer?.system !== "privacy-shield") {
    throw new Error("Privacy Shield delivery only accepts privacy-shield envelopes");
  }
  const token = String(bearerToken ?? "").trim();
  if (!token) throw new Error("GoreeCloud Identity bearer credential is required");
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");

  let response;
  try {
    response = await fetchImpl(meshEndpoint(meshBaseUrl), {
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
  } catch (cause) {
    throw new Error("Mesh evidence delivery failed before acceptance", { cause });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Mesh evidence delivery returned invalid JSON with HTTP ${response.status}`);
  }
  if (!response.ok || ![200, 201].includes(response.status)) {
    const detail = typeof payload?.error === "string" && payload.error ? payload.error : "Mesh rejected evidence delivery";
    throw new Error(`Mesh evidence delivery failed with HTTP ${response.status}: ${detail}`);
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
