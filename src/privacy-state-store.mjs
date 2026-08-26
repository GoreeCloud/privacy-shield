import fs from "node:fs";
import path from "node:path";

function clone(value) {
  return value == null ? value : structuredClone(value);
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
    let initial = {};
    if (fs.existsSync(resolved)) {
      const raw = fs.readFileSync(resolved, "utf8").trim();
      if (raw) initial = JSON.parse(raw);
    }
    super(initial);
    this.filePath = resolved;
  }

  persist() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const snapshot = Object.fromEntries(this.state.entries());
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temporary, this.filePath);
  }

  set(namespace, key, value) {
    const stored = super.set(namespace, key, value);
    this.persist();
    return stored;
  }

  delete(namespace, key) {
    const deleted = super.delete(namespace, key);
    if (deleted) this.persist();
    return deleted;
  }
}
