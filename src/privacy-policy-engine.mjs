const EFFECTS = new Set(["DENY", "REQUIRE_USER_DECISION", "CONSTRAIN"]);

function array(value) {
  return value === undefined ? null : Array.isArray(value) ? value : [value];
}

function intersects(left, right) {
  if (!left) return right ? [...right] : null;
  if (!right) return [...left];
  return left.filter(value => right.includes(value));
}

function matches(rule, request) {
  const when = rule.when ?? {};
  const checks = [
    ["requester_ids", request.requester?.id],
    ["requester_types", request.requester?.type],
    ["resource_ids", request.resource?.id],
    ["resource_classifications", request.resource?.classification],
    ["purposes", request.purpose],
    ["operations", request.operation],
    ["processing_zones", request.processing_zone],
    ["destinations", request.destination]
  ];

  for (const [key, actual] of checks) {
    const expected = array(when[key]);
    if (expected && !expected.includes(actual)) return false;
  }

  if (when.external_disclosure !== undefined && Boolean(request.external_disclosure) !== when.external_disclosure) {
    return false;
  }
  return true;
}

function validateRule(rule) {
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) throw new TypeError("Privacy policy rule must be an object");
  if (!rule.id || typeof rule.id !== "string") throw new TypeError("Privacy policy rule requires id");
  if (!EFFECTS.has(rule.effect)) throw new TypeError(`Privacy policy rule ${rule.id} has unsupported effect`);
  if (rule.priority !== undefined && (!Number.isInteger(rule.priority) || rule.priority < 0)) {
    throw new TypeError(`Privacy policy rule ${rule.id} priority must be a non-negative integer`);
  }
  if (rule.effect === "CONSTRAIN" && (!rule.constraints || typeof rule.constraints !== "object" || Array.isArray(rule.constraints))) {
    throw new TypeError(`Privacy policy rule ${rule.id} requires constraints`);
  }
  return rule;
}

export class PrivacyPolicyEngine {
  constructor(rules = []) {
    if (!Array.isArray(rules)) throw new TypeError("Privacy policy rules must be an array");
    this.rules = rules.map(validateRule).sort((a, b) => (a.priority ?? 1000) - (b.priority ?? 1000));
  }

  evaluate(request) {
    const result = {
      effect: "NONE",
      policy_references: [],
      obligations: [],
      constraints: {
        allowed_processing_zones: null,
        allowed_destinations: null,
        allowed_retention_modes: null,
        require_no_external_disclosure: false,
        max_capability_ttl_seconds: null
      }
    };

    for (const rule of this.rules) {
      if (!matches(rule, request)) continue;
      result.policy_references.push(rule.id);

      if (rule.effect === "DENY") {
        return { ...result, effect: "DENY", reason_code: rule.reason_code ?? "POLICY_DENIED" };
      }
      if (rule.effect === "REQUIRE_USER_DECISION") {
        return { ...result, effect: "REQUIRE_USER_DECISION", reason_code: rule.reason_code ?? "POLICY_REQUIRES_USER_DECISION" };
      }

      result.effect = "CONSTRAIN";
      const constraints = rule.constraints;
      result.constraints.allowed_processing_zones = intersects(
        result.constraints.allowed_processing_zones,
        constraints.allowed_processing_zones ?? null
      );
      result.constraints.allowed_destinations = intersects(
        result.constraints.allowed_destinations,
        constraints.allowed_destinations ?? null
      );
      result.constraints.allowed_retention_modes = intersects(
        result.constraints.allowed_retention_modes,
        constraints.allowed_retention_modes ?? null
      );
      result.constraints.require_no_external_disclosure ||= constraints.require_no_external_disclosure === true;
      if (constraints.max_capability_ttl_seconds !== undefined) {
        const ttl = constraints.max_capability_ttl_seconds;
        if (!Number.isInteger(ttl) || ttl < 1) throw new TypeError(`Privacy policy rule ${rule.id} has invalid max_capability_ttl_seconds`);
        result.constraints.max_capability_ttl_seconds = result.constraints.max_capability_ttl_seconds === null
          ? ttl
          : Math.min(result.constraints.max_capability_ttl_seconds, ttl);
      }
      for (const obligation of constraints.obligations ?? []) {
        if (!result.obligations.includes(obligation)) result.obligations.push(obligation);
      }
    }

    return result;
  }
}

export function policyConstraintViolation(policyResult, request) {
  const constraints = policyResult?.constraints;
  if (!constraints) return null;
  if (constraints.allowed_processing_zones && !constraints.allowed_processing_zones.includes(request.processing_zone)) return "POLICY_PROCESSING_ZONE_RESTRICTED";
  if (constraints.allowed_destinations && !constraints.allowed_destinations.includes(request.destination)) return "POLICY_DESTINATION_RESTRICTED";
  if (constraints.allowed_retention_modes && !constraints.allowed_retention_modes.includes(request.retention?.mode)) return "POLICY_RETENTION_RESTRICTED";
  if (constraints.require_no_external_disclosure && request.external_disclosure) return "POLICY_EXTERNAL_DISCLOSURE_PROHIBITED";
  return null;
}
