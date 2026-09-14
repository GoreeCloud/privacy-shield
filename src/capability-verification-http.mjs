const CAPABILITY_VERIFICATION_HTTP_MAX_REQUEST_BYTES = 16 * 1024;
const CAPABILITY_VERIFICATION_HTTP_MEDIA_TYPE = "application/json";

function responseHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    "Content-Type": `${CAPABILITY_VERIFICATION_HTTP_MEDIA_TYPE}; charset=utf-8`,
    ...extra,
  };
}

function jsonResponse(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders(extraHeaders),
  });
}

function normalizedMediaType(value) {
  return String(value ?? "").split(";", 1)[0].trim().toLowerCase();
}

function normalizedIdentity(value) {
  return String(value ?? "").trim();
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Creates the bounded HTTP protocol boundary for capability-reference
 * verification. Authentication is intentionally outside the request body: the
 * hosting Identity-aware transport must supply authenticatedConsumerId from its
 * verified service identity. A body-supplied consumer_id can only confirm that
 * identity; it can never create or replace it.
 *
 * This adapter does not open a socket and does not choose an authentication
 * mechanism. Shipping it therefore does not establish a production transport.
 * A runtime must still connect GoreeCloud Identity authentication before this
 * handler can be exposed, and Privacy Shield acceptance remains per runtime.
 */
export function createCapabilityVerificationHTTPHandler({ verificationService } = {}) {
  if (!verificationService || typeof verificationService.verify !== "function") {
    throw new TypeError("Capability verification HTTP handler requires the verification service");
  }

  return async function handleCapabilityVerificationHTTP(
    request,
    { authenticatedConsumerId } = {},
  ) {
    if (!request || typeof request.text !== "function" || !request.headers) {
      return jsonResponse(400, { error: "invalid_request" });
    }
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "method_not_allowed" }, { Allow: "POST" });
    }
    if (normalizedMediaType(request.headers.get("content-type")) !== CAPABILITY_VERIFICATION_HTTP_MEDIA_TYPE) {
      return jsonResponse(415, { error: "unsupported_media_type" });
    }

    const authenticatedIdentity = normalizedIdentity(authenticatedConsumerId);
    if (!authenticatedIdentity) {
      return jsonResponse(401, { error: "authenticated_consumer_required" });
    }

    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > CAPABILITY_VERIFICATION_HTTP_MAX_REQUEST_BYTES) {
      return jsonResponse(413, { error: "request_too_large" });
    }

    let encoded;
    try {
      encoded = await request.text();
    } catch {
      return jsonResponse(400, { error: "invalid_request" });
    }
    if (new TextEncoder().encode(encoded).byteLength > CAPABILITY_VERIFICATION_HTTP_MAX_REQUEST_BYTES) {
      return jsonResponse(413, { error: "request_too_large" });
    }

    let payload;
    try {
      payload = JSON.parse(encoded);
    } catch {
      return jsonResponse(400, { error: "invalid_json" });
    }
    if (!isRecord(payload)) {
      return jsonResponse(400, { error: "invalid_request" });
    }

    const bodyConsumer = normalizedIdentity(payload.consumer_id);
    if (!bodyConsumer || bodyConsumer !== authenticatedIdentity) {
      return jsonResponse(403, { error: "consumer_identity_mismatch" });
    }

    try {
      const result = verificationService.verify({
        ...payload,
        consumer_id: authenticatedIdentity,
      });
      return jsonResponse(200, result);
    } catch {
      // Do not expose token/reference state, allowlist membership, signing
      // details, or internal enforcement errors through the transport surface.
      return jsonResponse(403, { error: "capability_verification_denied" });
    }
  };
}

export {
  CAPABILITY_VERIFICATION_HTTP_MAX_REQUEST_BYTES,
  CAPABILITY_VERIFICATION_HTTP_MEDIA_TYPE,
};
