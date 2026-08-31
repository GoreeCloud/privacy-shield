import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const STATE_VERSION = 1;
const STATE_FIELDS = new Set(["version", "entries"]);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseState(raw, filePath) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Privacy state JSON is invalid at ${filePath}`, { cause: error });
  }
  if (!isRecord(parsed)) throw new Error(`Privacy state must be an object at ${filePath}`);

  // Backward compatibility: pre-versioned Privacy Shield state was a flat map
  // of namespace:key entries. It remains readable and is upgraded on the next write.
  if (!("version" in parsed)) return parsed;

  for (const key of Object.keys(parsed)) {
    if (!STATE_FIELDS.has(key)) throw new Error(`Unexpected Privacy Shield state field: ${key}`);
  }
  if (parsed.version !== STATE_VERSION) {
    throw new Error(`Unsupported Privacy Shield state version: ${String(parsed.version)}`);
  }
  if (!isRecord(parsed.entries)) throw new Error("Privacy Shield state entries must be an object");
  return parsed.entries;
}

function fingerprint(raw) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function readValidatedState(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) throw new Error(`Privacy state is empty at ${filePath}`);
  return {
    entries: parseState(raw.trim(), filePath),
    fingerprint: fingerprint(raw),
  };
}

function stateDocument(entries) {
  return { version: STATE_VERSION, entries };
}

function encodeDocument(document) {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export class MemoryPrivacyStateStore {
  constructor(initial = {}) {
    this.state = new Map(Object.entries(initial));
  }

  get(namespace, key) {
    return clone(this.state.get(`${namespace}:${key}`) ?? null);
  }

  set(namespace, key, value) {
    this.state.set(`${namespace}:${key}`, clone(value));
    return clone(value);
  }

  delete(namespace, key) {
    return this.state.delete(`${namespace}:${key}`);
  }

  list(namespace) {
    const prefix = `${namespace}:`;
    return [...this.state.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key: key.slice(prefix.length), value: clone(value) }));
  }
}

export class FilePrivacyStateStore extends MemoryPrivacyStateStore {
  constructor(filePath) {
    if (!filePath) throw new TypeError("FilePrivacyStateStore requires filePath");
    const resolved = path.resolve(filePath);
    const backupPath = `${resolved}.bak`;
    let initial = {};
    let diskFingerprint = null;
    let primaryError = null;

    if (fs.existsSync(resolved)) {
      try {
        const loaded = readValidatedState(resolved);
        initial = loaded.entries;
        diskFingerprint = loaded.fingerprint;
      } catch (error) {
        primaryError = error;
      }
    }

    if (primaryError || (!fs.existsSync(resolved) && fs.existsSync(backupPath))) {
      try {
        const recovered = readValidatedState(backupPath);
        initial = recovered.entries;
        diskFingerprint = FilePrivacyStateStore.writeDocument(
          resolved,
          stateDocument(initial),
        );
      } catch (backupError) {
        throw new Error(
          "Privacy Shield durable state is unavailable or invalid; refusing to continue without a validated primary or backup state",
          { cause: primaryError ?? backupError },
        );
      }
    }

    super(initial);
    this.filePath = resolved;
    this.backupPath = backupPath;
    this.diskFingerprint = diskFingerprint;
  }

  static writeDocument(filePath, document) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const encoded = encodeDocument(document);
    fs.writeFileSync(temporary, encoded, { mode: 0o600 });
    fs.renameSync(temporary, filePath);
    fs.chmodSync(filePath, 0o600);
    return fingerprint(encoded);
  }

  persist() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const exists = fs.existsSync(this.filePath);

    if (exists) {
      const current = readValidatedState(this.filePath);
      if (this.diskFingerprint === null) {
        throw new Error(
          "Privacy Shield durable state was created by another runtime after this store loaded; refusing stale write",
        );
      }
      if (current.fingerprint !== this.diskFingerprint) {
        throw new Error(
          "Privacy Shield durable state changed since this runtime loaded it; refusing stale write",
        );
      }
      fs.copyFileSync(this.filePath, this.backupPath);
      fs.chmodSync(this.backupPath, 0o600);
    } else if (this.diskFingerprint !== null) {
      throw new Error(
        "Privacy Shield durable state disappeared after this runtime loaded it; refusing to recreate from stale memory",
      );
    }

    const entries = Object.fromEntries(this.state.entries());
    this.diskFingerprint = FilePrivacyStateStore.writeDocument(
      this.filePath,
      stateDocument(entries),
    );
  }

  set(namespace, key, value) {
    const storageKey = `${namespace}:${key}`;
    const hadPrevious = this.state.has(storageKey);
    const previous = clone(this.state.get(storageKey));
    const stored = super.set(namespace, key, value);
    try {
      this.persist();
      return stored;
    } catch (error) {
      if (hadPrevious) this.state.set(storageKey, previous);
      else this.state.delete(storageKey);
      throw error;
    }
  }

  delete(namespace, key) {
    const storageKey = `${namespace}:${key}`;
    if (!this.state.has(storageKey)) return false;
    const previous = clone(this.state.get(storageKey));
    super.delete(namespace, key);
    try {
      this.persist();
      return true;
    } catch (error) {
      this.state.set(storageKey, previous);
      throw error;
    }
  }
}
