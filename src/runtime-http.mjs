import {
  createCapabilityVerificationHTTPHandler,
} from "./capability-verification-http.mjs";
import {
  PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT,
} from "./state-provider-acceptance.mjs";
import {
  PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT,
} from "./signing-key-acceptance.mjs";

export const PRIVACY_RUNTIME_HTTP_API_VERSION = "privacy-runtime-http/v1";
export const PRIVACY_RUNTIME_HEALTH_PATH = "/healthz";
export const PRIVACY_RUNTIME_READINESS_PATH = "/readyz";
export const PRIVACY_CAPABILITY_VERIFICATION_PATH = "/v1/capabilities/verify";

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function freshAcceptance(record, contractId, now) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  if (record.contract_id !== contractId) return false;
  if (typeof record.valid_until !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(record.valid_until)) {
    return false;
  }
  const validUntil = Date.parse(record.valid_until);
  return Number.isFinite(validUntil) && validUntil > now;
}

async function readiness(runtime, readinessProbe, now = Date.now()) {
  const productionMode = runtime?.production === true;
  const stateProviderAccepted = freshAcceptance(
    runtime?.state_acceptance,
    PRIVACY_STATE_PROVIDER_ACCEPTANCE_CONTRACT,
    now,
  );
  const signingProviderAccepted = freshAcceptance(
    runtime?.signing_acceptance,
    PRIVACY_SIGNING_KEY_ACCEPTANCE_CONTRACT,
    now,
  );

  let runtimeProbePassed = false;
  if (typeof readinessProbe === "function") {
    try {
      runtimeProbePassed = (await readinessProbe({ runtime })) === true;
    } catch {
      runtimeProbePassed = false;
    }
  }

  const ready =
    productionMode
    && stateProviderAccepted
    && signingProviderAccepted
    && runtimeProbePassed;

  return {
    ready,
    dependencies: {
      production_mode: productionMode ? "accepted" : "unaccepted",
      state_provider: stateProviderAccepted ? "accepted" : "unaccepted",
      signing_provider: signingProviderAccepted ? "accepted" : "unaccepted",
      runtime_probe: runtimeProbePassed ? "passed" : "unavailable",
    },
  };
}

/**
 * Portable HTTP boundary for a hosted Privacy Shield authority runtime.
 *
 * The host remains responsible for binding GoreeCloud Identity authentication,
 * providing the real capability verification service, and supplying a read-only
 * readiness probe that exercises its accepted production provider path.
 *
 * Source construction alone does not establish deployment or production
 * acceptance.
 */
export function createPrivacyShieldHTTPHandler({
  runtime,
  verificationService,
  readinessProbe,
  now = () => Date.now(),
} = {}) {
  const capabilityVerification = createCapabilityVerificationHTTPHandler({
    verificationService,
  });

  return async function handlePrivacyShieldHTTP(
    request,
    { authenticatedConsumerId } = {},
  ) {
    if (!request || typeof request.method !== "string" || typeof request.url !== "string") {
      return jsonResponse(400, { error: "invalid_request" });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === PRIVACY_RUNTIME_HEALTH_PATH) {
      return jsonResponse(200, {
        service: "goreecloud-privacy-shield",
        status: "alive",
        authority: "privacy",
      });
    }

    if (request.method === "GET" && url.pathname === PRIVACY_RUNTIME_READINESS_PATH) {
      const snapshot = await readiness(runtime, readinessProbe, now());
      return jsonResponse(snapshot.ready ? 200 : 503, {
        service: "goreecloud-privacy-shield",
        status: snapshot.ready ? "ready" : "not_ready",
        dependencies: snapshot.dependencies,
      });
    }

    if (url.pathname === PRIVACY_CAPABILITY_VERIFICATION_PATH) {
      return capabilityVerification(request, { authenticatedConsumerId });
    }

    return jsonResponse(404, { error: "not_found" });
  };
}
