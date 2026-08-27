import { chmod, copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const STATE_VERSION = 1;
const STATE_KEYS = new Set([
  "version",
  "consentGrants",
  "usedCapabilityIds",
  "revokedCapabilityIds",
  "evidenceRecords",
]);

function emptyState() {
  return {
    version: STATE_VERSION,
    consentGrants: {},
    usedCapabilityIds: {},
    revokedCapabilityIds: {},
    evidenceRecords: [],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateState(parsed) {
  if (!isRecord(parsed)) throw new Error("Privacy state must be a JSON object");
  if (parsed.version !== STATE_VERSION) {
    throw new Error(`Unsupported Privacy Shield state version: ${String(parsed.version)}`);
  }
  for (const key of Object.keys(parsed)) {
    if (!STATE_KEYS.has(key)) throw new Error(`Unexpected Privacy Shield state field: ${key}`);
  }
  if (!isRecord(parsed.consentGrants)) throw new Error("Privacy state consentGrants must be an object");
  if (!isRecord(parsed.usedCapabilityIds)) throw new Error("Privacy state usedCapabilityIds must be an object");
  if (!isRecord(parsed.revokedCapabilityIds)) throw new Error("Privacy state revokedCapabilityIds must be an object");
  if (!Array.isArray(parsed.evidenceRecords)) throw new Error("Privacy state evidenceRecords must be an array");
  return clone(parsed);
}

async function readValidatedState(filePath) {
  const raw = await readFile(filePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Privacy state JSON is invalid at ${filePath}`, { cause: error });
  }
  return validateState(parsed);
}

export class InMemoryPrivacyStateStore {
  constructor(initial = {}) {
    this.state = { ...emptyState(), ...clone(initial) };
  }

  async snapshot() {
    return clone(this.state);
  }

  async readConsentGrant(grantId) {
    return clone(this.state.consentGrants[grantId] ?? null);
  }

  async putConsentGrant(grant) {
    this.state.consentGrants[grant.id] = clone(grant);
    return clone(grant);
  }

  async deleteConsentGrant(grantId) {
    delete this.state.consentGrants[grantId];
  }

  async hasUsedCapabilityId(capabilityId) {
    return Boolean(this.state.usedCapabilityIds[capabilityId]);
  }

  async markCapabilityUsed(capabilityId, usedAt = new Date().toISOString()) {
    this.state.usedCapabilityIds[capabilityId] = usedAt;
  }

  async isCapabilityRevoked(capabilityId) {
    return Boolean(this.state.revokedCapabilityIds[capabilityId]);
  }

  async revokeCapability(capabilityId, revokedAt = new Date().toISOString()) {
    this.state.revokedCapabilityIds[capabilityId] = revokedAt;
  }

  async appendEvidence(record) {
    this.state.evidenceRecords.push(clone(record));
    return clone(record);
  }

  async listEvidence() {
    return clone(this.state.evidenceRecords);
  }
}

export class JsonFilePrivacyStateStore extends InMemoryPrivacyStateStore {
  constructor(filePath) {
    if (!String(filePath ?? "").trim()) throw new Error("Privacy state file path is required");
    super();
    this.filePath = filePath;
    this.backupPath = `${filePath}.bak`;
  }

  static async open(filePath) {
    const store = new JsonFilePrivacyStateStore(filePath);
    await store.#load();
    return store;
  }

  async #load() {
    let primaryError = null;
    try {
      this.state = await readValidatedState(this.filePath);
      return;
    } catch (error) {
      primaryError = error;
    }

    try {
      this.state = await readValidatedState(this.backupPath);
      await this.#writePrimary({ updateBackup: false });
      return;
    } catch (backupError) {
      if (primaryError?.code === "ENOENT" && backupError?.code === "ENOENT") {
        this.state = emptyState();
        return;
      }
      throw new Error("Privacy Shield durable state is unavailable or invalid; refusing to continue without a validated primary or backup state", {
        cause: primaryError?.code === "ENOENT" ? backupError : primaryError,
      });
    }
  }

  async #writePrimary({ updateBackup = true } = {}) {
    await mkdir(dirname(this.filePath), { recursive: true });
    if (updateBackup) {
      try {
        await readValidatedState(this.filePath);
        await copyFile(this.filePath, this.backupPath);
        await chmod(this.backupPath, 0o600);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }

    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(this.state, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(tempPath, this.filePath);
    await chmod(this.filePath, 0o600);
  }

  async #persistMutation(mutate) {
    const previous = clone(this.state);
    try {
      const result = await mutate();
      await this.#writePrimary();
      return result;
    } catch (error) {
      this.state = previous;
      throw error;
    }
  }

  async putConsentGrant(grant) {
    return this.#persistMutation(() => super.putConsentGrant(grant));
  }

  async deleteConsentGrant(grantId) {
    return this.#persistMutation(() => super.deleteConsentGrant(grantId));
  }

  async markCapabilityUsed(capabilityId, usedAt) {
    return this.#persistMutation(() => super.markCapabilityUsed(capabilityId, usedAt));
  }

  async revokeCapability(capabilityId, revokedAt) {
    return this.#persistMutation(() => super.revokeCapability(capabilityId, revokedAt));
  }

  async appendEvidence(record) {
    return this.#persistMutation(() => super.appendEvidence(record));
  }
}
