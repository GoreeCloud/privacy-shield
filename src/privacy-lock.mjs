import crypto from "node:crypto";
import {
  MemoryPrivacyStateStore,
  mutatePrivacyState,
} from "./privacy-state-store.mjs";

export const PRIVACY_LOCK_CONTRACT = "goreecloud.privacy-shield.privacy-lock.v1";
export const PRIVACY_LOCK_ASSESSMENT_CONTRACT =
  "goreecloud.privacy-shield.privacy-lock-assessment.v1";

export const PRIVACY_LOCK_OPTIONAL_CATEGORIES = Object.freeze([
  "optional_data_sharing",
  "optional_personalization",
  "nonessential_background_access",
  "optional_external_processing",
  "optional_ai_context",
  "optional_diagnostics",
  "optional_cross_application_data_use",
]);

export const PRIVACY_LOCK_INDEPENDENT_CATEGORIES = Object.freeze([
  "essential_security",
  "account_recovery",
  "emergency_operation",
  "resilience_operation",
  "required_system_operation",
]);

const OPTIONAL_CATEGORY_SET = new Set(PRIVACY_LOCK_OPTIONAL_CATEGORIES);
const INDEPENDENT_CATEGORY_SET = new Set(PRIVACY_LOCK_INDEPENDENT_CATEGORIES);
const VALID_EFFECTS = new Set(["deny", "constrain"]);
const VALID_ACTOR_TYPES = new Set(["user", "administrator"]);
const VALID_MODES = new Set(["strict_optional", "custom"]);
const DECISION_OUTCOMES = new Set([
  "ALLOW",
  "DENY",
  "ALLOW_WITH_CONSTRAINTS",
  "REQUIRE_USER_DECISION",
]);

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function requiredString(value, field) {
  if (
    typeof value !== "string"
    || !value
    || value !== value.trim()
    || value.length > 256
    || /[\u0000-\u001F\u007F-\u009F]/.test(value)
  ) {
    throw new TypeError(`Privacy Lock requires canonical ${field}`);
  }
  return value;
}

function timestamp(value, field) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      throw new TypeError(`Privacy Lock requires valid ${field}`);
    }
    return value.toISOString();
  }
  if (
    typeof value !== "string"
    || !value
    || value !== value.trim()
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError(`Privacy Lock requires valid ${field}`);
  }
  return new Date(value).toISOString();
}

function normalizeActor(actor, field = "actor") {
  if (!actor || typeof actor !== "object" || Array.isArray(actor)) {
    throw new TypeError(`Privacy Lock requires ${field}`);
  }
  const type = requiredString(actor.type, `${field}.type`);
  if (!VALID_ACTOR_TYPES.has(type)) {
    throw new TypeError(`Privacy Lock ${field}.type is unsupported`);
  }
  return {
    id: requiredString(actor.id, `${field}.id`),
    type,
  };
}

function normalizeApplicationIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("Privacy Lock application_ids must be a non-empty array");
  }
  const ids = value.map(item => requiredString(item, "application_ids"));
  if (new Set(ids).size !== ids.length) {
    throw new TypeError("Privacy Lock application_ids must not contain duplicates");
  }
  if (ids.includes("*") && ids.length !== 1) {
    throw new TypeError("Privacy Lock wildcard application scope must be exclusive");
  }
  return [...ids].sort();
}

function normalizeConstraints(value, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new TypeError("Privacy Lock constrain rule requires constraints");
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TypeError("Privacy Lock constraints must be an array");
  }
  const constraints = value.map(item => requiredString(item, "constraints"));
  if (new Set(constraints).size !== constraints.length) {
    throw new TypeError("Privacy Lock constraints must not contain duplicates");
  }
  if (required && constraints.length === 0) {
    throw new TypeError("Privacy Lock constrain rule requires constraints");
  }
  return [...constraints].sort();
}

function normalizeRule(rule) {
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
    throw new TypeError("Privacy Lock rule must be an object");
  }
  const category = requiredString(rule.category, "rule.category");
  if (!OPTIONAL_CATEGORY_SET.has(category)) {
    throw new TypeError("Privacy Lock rules may target optional categories only");
  }
  const effect = requiredString(rule.effect, "rule.effect");
  if (!VALID_EFFECTS.has(effect)) {
    throw new TypeError("Privacy Lock rule effect is unsupported");
  }
  const constraints = normalizeConstraints(rule.constraints, effect === "constrain");
  if (effect === "deny" && constraints.length > 0) {
    throw new TypeError("Privacy Lock deny rules must not carry constraints");
  }
  return { category, effect, constraints };
}

function compileRules(mode, rules) {
  if (mode === "strict_optional") {
    if (rules !== undefined && rules !== null && rules.length !== 0) {
      throw new TypeError("strict_optional Privacy Lock does not accept custom rules");
    }
    return PRIVACY_LOCK_OPTIONAL_CATEGORIES.map(category => ({
      category,
      effect: "deny",
      constraints: [],
    }));
  }
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new TypeError("custom Privacy Lock requires at least one rule");
  }
  const normalized = rules.map(normalizeRule);
  const categories = normalized.map(rule => rule.category);
  if (new Set(categories).size !== categories.length) {
    throw new TypeError("Privacy Lock rules must not repeat a category");
  }
  return normalized.sort((a, b) => a.category.localeCompare(b.category));
}

function lockStatus(lock, nowMs) {
  if (lock.released_at) return "released";
  if (Date.parse(lock.expires_at) <= nowMs) return "expired";
  return "active";
}

function validateDecision(decision) {
  if (!decision || typeof decision !== "object" || Array.isArray(decision)) {
    throw new TypeError("Privacy Lock assessment requires a decision object");
  }
  if (!DECISION_OUTCOMES.has(decision.outcome)) {
    throw new TypeError("Privacy Lock decision outcome is unsupported");
  }
  return structuredClone(decision);
}

function applicationInScope(lock, applicationId) {
  return lock.application_ids.includes("*") || lock.application_ids.includes(applicationId);
}

function assessmentBase(lock, metadata) {
  return {
    contract: PRIVACY_LOCK_ASSESSMENT_CONTRACT,
    authorization_effect: "restriction_only",
    may_widen_authority: false,
    lock_id: lock?.lock_id ?? null,
    lock_expires_at: lock?.expires_at ?? null,
    application_id: metadata.application_id,
    category: metadata.category ?? null,
    effect: "none",
    reason_code: "PRIVACY_LOCK_NOT_APPLIED",
    constraints: [],
    independent_authority_required: false,
    independent_authority_reference: null,
  };
}

function verifyIndependentAuthority(verifier, context) {
  if (!verifier || typeof verifier.verify !== "function") return null;
  const result = verifier.verify(structuredClone(context));
  if (result && typeof result.then === "function") {
    throw new TypeError("Privacy Lock independent authority verification must be synchronous");
  }
  if (!result || typeof result !== "object" || result.accepted !== true) return null;
  return {
    authority: requiredString(result.authority, "independent authority name"),
    evidence_reference: requiredString(
      result.evidence_reference,
      "independent authority evidence_reference",
    ),
  };
}

function applyRestriction(decision, assessment) {
  const effective = structuredClone(decision);
  effective.privacy_lock = structuredClone(assessment);

  if (assessment.effect === "deny") {
    effective.outcome = "DENY";
    effective.reason_code = assessment.reason_code;
    effective.obligations = [
      ...new Set([...(effective.obligations ?? []), "respect_privacy_lock"]),
    ].sort();
    delete effective.capability_token_reference;
    return effective;
  }

  if (assessment.effect === "constrain") {
    if (effective.outcome === "ALLOW") effective.outcome = "ALLOW_WITH_CONSTRAINTS";
    if (effective.outcome === "ALLOW_WITH_CONSTRAINTS") {
      effective.obligations = [
        ...new Set([
          ...(effective.obligations ?? []),
          ...assessment.constraints,
          "respect_privacy_lock",
        ]),
      ].sort();
    }
    return effective;
  }

  return effective;
}

export class PrivacyLockAuthority {
  constructor({ store = new MemoryPrivacyStateStore() } = {}) {
    this.store = store;
  }

  create({
    subject_id,
    actor,
    mode = "strict_optional",
    rules = undefined,
    application_ids = ["*"],
    reason_code,
    expires_at,
    now = new Date(),
  }) {
    const subjectId = requiredString(subject_id, "subject_id");
    const normalizedActor = normalizeActor(actor);
    const normalizedMode = requiredString(mode, "mode");
    if (!VALID_MODES.has(normalizedMode)) {
      throw new TypeError("Privacy Lock mode is unsupported");
    }
    const createdAt = timestamp(now, "now");
    const expiresAt = timestamp(expires_at, "expires_at");
    if (Date.parse(expiresAt) <= Date.parse(createdAt)) {
      throw new TypeError("Privacy Lock expires_at must be after creation time");
    }
    const record = {
      lock_id: id("pslock"),
      contract: PRIVACY_LOCK_CONTRACT,
      schema_version: 1,
      subject_id: subjectId,
      actor: normalizedActor,
      mode: normalizedMode,
      reason_code: requiredString(reason_code, "reason_code"),
      application_ids: normalizeApplicationIds(application_ids),
      rules: compileRules(normalizedMode, rules),
      created_at: createdAt,
      expires_at: expiresAt,
      released_at: null,
      release: null,
    };

    return mutatePrivacyState(this.store, store => {
      const active = store
        .list("privacy_lock")
        .map(({ value }) => value)
        .find(
          lock =>
            lock.subject_id === subjectId &&
            lockStatus(lock, Date.parse(createdAt)) === "active",
        );
      if (active) throw new Error("PRIVACY_LOCK_ALREADY_ACTIVE");
      store.set("privacy_lock", record.lock_id, record);
      return structuredClone(record);
    });
  }

  get(lock_id) {
    const lockId = requiredString(lock_id, "lock_id");
    const record = this.store.get("privacy_lock", lockId);
    if (!record) return null;
    return {
      ...record,
      status: lockStatus(record, Date.now()),
    };
  }

  activeFor(subject_id, now = new Date()) {
    const subjectId = requiredString(subject_id, "subject_id");
    const nowMs = Date.parse(timestamp(now, "now"));
    const active = this.store
      .list("privacy_lock")
      .map(({ value }) => value)
      .find(
        lock =>
          lock.subject_id === subjectId
          && Date.parse(lock.created_at) <= nowMs
          && lockStatus(lock, nowMs) === "active",
      );
    return active ? structuredClone(active) : null;
  }

  release(lock_id, { actor, reason_code, now = new Date() }) {
    const lockId = requiredString(lock_id, "lock_id");
    const normalizedActor = normalizeActor(actor, "release.actor");
    const releasedAt = timestamp(now, "release.now");
    return mutatePrivacyState(this.store, store => {
      const record = store.get("privacy_lock", lockId);
      if (!record) throw new Error("PRIVACY_LOCK_NOT_FOUND");
      if (Date.parse(releasedAt) < Date.parse(record.created_at)) {
        throw new Error("PRIVACY_LOCK_RELEASE_BEFORE_CREATION");
      }
      if (lockStatus(record, Date.parse(releasedAt)) !== "active") {
        throw new Error("PRIVACY_LOCK_NOT_ACTIVE");
      }
      const released = {
        ...record,
        released_at: releasedAt,
        release: {
          actor: normalizedActor,
          reason_code: requiredString(reason_code, "release.reason_code"),
        },
      };
      store.set("privacy_lock", lockId, released);
      return structuredClone(released);
    });
  }

  assess({
    subject_id,
    application_id,
    participating,
    category,
    decision,
    independent_authority = null,
    independent_authority_reference = null,
    now = new Date(),
  }) {
    const baseDecision = validateDecision(decision);
    const metadata = {
      application_id: requiredString(application_id, "application_id"),
      category: category == null ? null : requiredString(category, "category"),
    };
    const lock = this.activeFor(subject_id, now);
    const assessment = assessmentBase(lock, metadata);

    if (!lock) {
      assessment.reason_code = "PRIVACY_LOCK_INACTIVE";
      return { assessment, decision: applyRestriction(baseDecision, assessment) };
    }
    if (participating !== true) {
      assessment.reason_code = "PRIVACY_LOCK_RUNTIME_NOT_PARTICIPATING";
      return { assessment, decision: applyRestriction(baseDecision, assessment) };
    }
    if (!metadata.category) {
      assessment.effect = "deny";
      assessment.reason_code = "PRIVACY_LOCK_CATEGORY_REQUIRED";
      return { assessment, decision: applyRestriction(baseDecision, assessment) };
    }
    if (!applicationInScope(lock, metadata.application_id)) {
      assessment.reason_code = "PRIVACY_LOCK_APPLICATION_OUT_OF_SCOPE";
      return { assessment, decision: applyRestriction(baseDecision, assessment) };
    }

    if (INDEPENDENT_CATEGORY_SET.has(metadata.category)) {
      assessment.independent_authority_required = true;
      const verified = verifyIndependentAuthority(independent_authority, {
        subject_id,
        application_id: metadata.application_id,
        category: metadata.category,
        authority_reference: independent_authority_reference,
        privacy_lock_id: lock.lock_id,
      });
      if (!verified) {
        assessment.effect = "deny";
        assessment.reason_code = "PRIVACY_LOCK_INDEPENDENT_AUTHORITY_REQUIRED";
        return { assessment, decision: applyRestriction(baseDecision, assessment) };
      }
      assessment.independent_authority_reference = verified;
      assessment.reason_code = "PRIVACY_LOCK_INDEPENDENT_AUTHORITY_VERIFIED";
      return { assessment, decision: applyRestriction(baseDecision, assessment) };
    }

    if (!OPTIONAL_CATEGORY_SET.has(metadata.category)) {
      assessment.effect = "deny";
      assessment.reason_code = "PRIVACY_LOCK_CATEGORY_UNSUPPORTED";
      return { assessment, decision: applyRestriction(baseDecision, assessment) };
    }

    const rule = lock.rules.find(item => item.category === metadata.category);
    if (!rule) {
      assessment.reason_code = "PRIVACY_LOCK_CATEGORY_NOT_RESTRICTED";
      return { assessment, decision: applyRestriction(baseDecision, assessment) };
    }

    assessment.effect = rule.effect;
    assessment.constraints = [...rule.constraints];
    assessment.reason_code =
      rule.effect === "deny" ? "PRIVACY_LOCK_ACTIVE_DENY" : "PRIVACY_LOCK_ACTIVE_CONSTRAINT";
    return { assessment, decision: applyRestriction(baseDecision, assessment) };
  }
}
