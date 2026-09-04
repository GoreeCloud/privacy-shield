#!/usr/bin/env python3
import hashlib
import json
import re
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "website"
DIST = SOURCE / "dist"
ICON = ROOT / "branding" / "privacy-shield" / "privacy-shield-icon.svg"
GLAZE_DIR = SOURCE / "glaze"
GLAZE_LOCK = SOURCE / "glaze.lock.json"
IMPORT_DIRECTIVE_RE = re.compile(r"@import\s+[^;]+;", re.IGNORECASE)
IMPORT_TARGET_RE = re.compile(
    r"@import\s+(?:url\(\s*)?[\"'](?P<target>[^\"']+)[\"']\s*\)?\s*;",
    re.IGNORECASE,
)


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data, usedforsecurity=False).hexdigest()


def require_glaze_name(name: str) -> str:
    if (
        not name.endswith(".css")
        or "/" in name
        or "\\" in name
        or name in {".", ".."}
    ):
        raise SystemExit(f"unsafe Glaze asset name: {name}")
    return name


def load_lock() -> dict[str, object]:
    lock = json.loads(GLAZE_LOCK.read_text(encoding="utf-8"))
    if lock.get("schema") != "goreecloud.glaze-ui.web-source-manifest.v1":
        raise SystemExit("unexpected Privacy Center Glaze lock schema")
    if lock.get("product") != "GLAZE UI V1.1" or lock.get("version") != "1.1.0":
        raise SystemExit("Privacy Center Glaze lock must target GLAZE UI V1.1 / 1.1.0")
    if lock.get("tag") != "v1.1.0":
        raise SystemExit("Privacy Center Glaze lock must use tag v1.1.0")
    if lock.get("release_commit") != "15cc76d2bcd4065552dc31c77145b63f34d9e7b2":
        raise SystemExit("Privacy Center Glaze lock release commit mismatch")
    if lock.get("entrypoint") != "css/glaze-v1.1.0.css":
        raise SystemExit("Privacy Center Glaze lock must use the V1.1 Stable entrypoint")
    if lock.get("runtime_network_dependency_required") is not False:
        raise SystemExit("Privacy Center must not require a runtime Glaze network dependency")
    files = lock.get("files")
    if not isinstance(files, dict) or not files:
        raise SystemExit("Privacy Center Glaze lock must contain CSS files")
    return lock


def validate_import_closure(assets: dict[str, bytes]) -> None:
    for name, data in assets.items():
        try:
            css = data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise SystemExit(f"Glaze stylesheet is not UTF-8: {name}") from exc

        directives = IMPORT_DIRECTIVE_RE.findall(css)
        targets = [match.group("target") for match in IMPORT_TARGET_RE.finditer(css)]
        if len(directives) != len(targets):
            raise SystemExit(f"unsupported or ambiguous CSS @import syntax in {name}")

        for target in targets:
            if not target.startswith("./"):
                raise SystemExit(f"Glaze import must be same-directory relative in {name}: {target}")
            if any(marker in target for marker in ("?", "#", "..")):
                raise SystemExit(f"unsafe Glaze import target in {name}: {target}")
            imported_name = require_glaze_name(target[2:])
            if imported_name not in assets:
                raise SystemExit(
                    f"Glaze import closure failure: {name} imports missing {imported_name}"
                )


def load_verified_glaze_assets() -> dict[str, bytes]:
    lock = load_lock()
    files = lock["files"]
    assert isinstance(files, dict)

    expected_names = {Path(path).name for path in files}
    actual_names = {
        path.name
        for path in GLAZE_DIR.iterdir()
        if path.is_file() and not path.is_symlink()
    }
    if actual_names != expected_names:
        raise SystemExit("vendored Privacy Center Glaze file set does not match the lock")

    assets: dict[str, bytes] = {}
    for upstream_path, expected_sha in files.items():
        if not isinstance(upstream_path, str) or not isinstance(expected_sha, str):
            raise SystemExit("invalid Privacy Center Glaze lock entry")
        name = require_glaze_name(Path(upstream_path).name)
        local = GLAZE_DIR / name
        if local.is_symlink() or not local.is_file():
            raise SystemExit(f"missing or unsafe locked Glaze source: {name}")
        data = local.read_bytes()
        actual_sha = git_blob_sha(data)
        if actual_sha != expected_sha:
            raise SystemExit(f"Glaze source blob mismatch for {name}: {actual_sha}")
        assets[name] = data

    validate_import_closure(assets)
    return assets


def build() -> None:
    """Build Privacy Center only from a complete, byte-verified Glaze graph."""

    # Resolve blob identity and the full local CSS import closure before
    # touching checked-in publication evidence. An incomplete immutable design
    # release must not silently replace a previously retained dist artifact.
    glaze_assets = load_verified_glaze_assets()

    if DIST.exists():
        if DIST.is_symlink():
            raise SystemExit("unsafe Privacy Center dist symlink")
        shutil.rmtree(DIST)
    (DIST / "assets" / "glaze").mkdir(parents=True)

    for name in ("index.html", "404.html", "_headers"):
        shutil.copy2(SOURCE / name, DIST / name)
    for name in ("site.css", "site-polish.css", "site.js"):
        shutil.copy2(SOURCE / name, DIST / "assets" / name)
    for name, data in glaze_assets.items():
        (DIST / "assets" / "glaze" / name).write_bytes(data)
    shutil.copy2(ICON, DIST / "assets" / "privacy-shield-icon.svg")

    print(
        f"Built {DIST.relative_to(ROOT)} with canonical Privacy Shield identity "
        "and a complete, immutable GLAZE UI V1.1 / 1.1.0 source graph"
    )


if __name__ == "__main__":
    build()
