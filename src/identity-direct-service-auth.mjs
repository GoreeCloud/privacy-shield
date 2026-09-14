import {
  CAPABILITY_VERIFICATION_HTTP_MAX_REQUEST_BYTES,
  CAPABILITY_VERIFICATION_HTTP_MEDIA_TYPE,
  createCapabilityVerificationHTTPHandler,
} from "./capability-verification-http.mjs";

const IDENTITY_DIRECT_SERVICE_AUDIENCE = "goreecloud-privacy-shield";
const IDENTITY_DIRECT_SERVICE_SEARCH_ID = "goreecloud-search";
const IDENTITY_DIRECT_SERVICE_VERIFY_SCOPE = "privacy.capability-reference.verify";
const IDENTITY_DIRECT_SERVICE_CONSUME_SCOPE = "privacy.capability-reference.consume";

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

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function bearerTokenFrom(request) {
  const authorization = request?.headers?.get?.("authorization");
  if (typeof authorization !== "string") {
    return null;
  }
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match || match[1].length > CAPABILITY_VERIFICATION_HTTP_MAX_REQUEST_BYTES) {
    return null;
  }
  return match[1];
}

async function boundedPayloadCopy(request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > CAPABILITY_VERIFICATION_HTTP_MAX_REQUEST_BYTES) {
    return { error: jsonResponse(413, { error: "request_too_large" }) };
  }

  let encoded;
  try {
    encoded = await request.clone().text();
  } catch {
    return { error: jsonResponse(400, { error: "invalid_request" }) };
  }
  if (new TextEncoder().encode(encoded).byteLength > CAPABILITY_VERIFICATION_HTTP_MAX_REQUEST_BYTES) {
    return { error: jsonResponse(413, { error: "request_too_large" }) };
  }

  try {
    const payload = JSON.parse(encoded);
    if (!isRecord(payload)) {
      return { error: jsonResponse(400, { error: "invalid_request" }) };
    }
    return { payload };
  } catch {
    return { error: jsonResponse(400, { error: "invalid_json" }) };
  }
}

function acceptedIdentityVerification(result, requiredScope) {
  if (!isRecord(result)) {
    return null;
  }
  if (result.service_id !== IDENTITY_DIRECT_SERVICE_SEARCH_ID) {
    return null;
  }
  if (result.audience !== IDENTITY_DIRECT_SERVICE_AUDIENCE) {
    return null;
  }
  if (!Array.isArray(result.scopes) || !result.scopes.every((scope) => typeof scope === "string")) {
    return null;
  }
  if (!result.scopes.includes(requiredScope)) {
    return null;
  }
  return result.service_id;
}

/**
 * Adds GoreeCloud Identity direct-service authentication in front of the
 * authority-owned capability-reference verification HTTP handler.
 *
 * identityTokenVerifier must verify the opaque bearer credential using the
 * Identity-owned direct-service contract/JWKS and return minimized verified
 * metadata. This module does not parse JWTs, fetch JWKS, mint credentials, or
 * infer identity from network location, Mesh membership, or request payloads.
 *
 * The authenticated service identity is separate from expected.requester_id:
 * Search is the service caller, while the requester remains an independently
 * authenticated operation claim that Privacy Shield verifies against the
 * capability reference.
 */
export function createIdentityAuthenticatedCapabilityVerificationHTTPHandler({
  verificationService,
  identityTokenVerifier,
} = {}) {
  if (!identityTokenVerifier || typeof identityTokenVerifier.verifyDirectServiceToken !== "function") {
    throw new TypeError("Identity direct-service token verifier is required");
  }

  const capabilityHandler = createCapabilityVerificationHTTPHandler({ verificationService });

  return async function handleIdentityAuthenticatedCapabilityVerification(request) {
    if (!request || typeof request.text !== "function" || !request.headers) {
      return jsonResponse(400, { error: "invalid_request" });
    }
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "method_not_allowed" }, { Allow: "POST" });
    }
    if (normalizedMediaType(request.headers.get("content-type")) !== CAPABILITY_VERIFICATION_HTTP_MEDIA_TYPE) {
      return jsonResponse(415, { error: "unsupported_media_type" });
    }

    const token = bearerTokenFrom(request);
    if (!token) {
      return jsonResponse(401, { error: "service_authentication_required" });
    }

    const copied = await boundedPayloadCopy(request);
    if (copied.error) {
      return copied.error;
    }
    if (typeof copied.payload.consume !== "boolean") {
      return jsonResponse(400, { error: "invalid_request" });
    }

    const requiredScope = copied.payload.consume
      ? IDENTITY_DIRECT_SERVICE_CONSUME_SCOPE
      : IDENTITY_DIRECT_SERVICE_VERIFY_SCOPE;

    let identityResult;
    try {
      identityResult = await identityTokenVerifier.verifyDirectServiceToken(token, {
        audience: IDENTITY_DIRECT_SERVICE_AUDIENCE,
        requiredScopes: [requiredScope],
      });
    } catch {
      return jsonResponse(401, { error: "service_authentication_denied" });
    }

    const authenticatedConsumerId = acceptedIdentityVerification(identityResult, requiredScope);
    if (!authenticatedConsumerId) {
      return jsonResponse(401, { error: "service_authentication_denied" });
    }

    return capabilityHandler(request, { authenticatedConsumerId });
  };
}

export {
  IDENTITY_DIRECT_SERVICE_AUDIENCE,
  IDENTITY_DIRECT_SERVICE_CONSUME_SCOPE,
  IDENTITY_DIRECT_SERVICE_SEARCH_ID,
  IDENTITY_DIRECT_SERVICE_VERIFY_SCOPE,
};
