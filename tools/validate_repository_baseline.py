from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_ROOT_FILES = (
    "README.md",
    "LICENSE",
    ".gitignore",
    ".editorconfig",
    "goreecloud.platform.yaml",
)

REQUIRED_DOC_FILES = (
    "docs/README.md",
    "docs/BENEFITS.md",
    "docs/BRANDING.md",
    "docs/CAPABILITIES.md",
    "docs/CHANGELOGS.md",
    "docs/COMPETITIVE-OBJECTIVES.md",
    "docs/EVERKEEP-LIFECYCLE.md",
    "docs/FEATURES.md",
    "docs/IMPLEMENTED-FEATURES.md",
    "docs/NOTES.md",
    "docs/PLANNED-FEATURES.md",
    "docs/PRIVACY POLICY.md",
    "docs/PRIVACY-LOCK.md",
    "docs/PRIVACY-RECEIPTS-2.md",
    "docs/PROJECT-RECORD.md",
    "docs/PROJECT-SPECIFICATIONS.md",
    "docs/RUNTIME-TRUST-ACCEPTANCE-MATRIX.md",
    "docs/SECURITY.md",
    "docs/USER-MANUAL.md",
)

PROHIBITED_ROOT_DOCUMENTS = (
    "BENEFITS.md",
    "BRANDING.md",
    "CAPABILITIES.md",
    "CHANGELOGS.md",
    "COMPETITIVE-OBJECTIVES.md",
    "EVERKEEP-LIFECYCLE.md",
    "FEATURES.md",
    "IMPLEMENTED-FEATURES.md",
    "NOTES.md",
    "PLANNED-FEATURES.md",
    "PRIVACY POLICY.md",
    "PRIVACY-LOCK.md",
    "PRIVACY-RECEIPTS-2.md",
    "PROJECT-RECORD.md",
    "PROJECT-SPECIFICATIONS.md",
    "RUNTIME-TRUST-ACCEPTANCE-MATRIX.md",
    "SECURITY.md",
    "USER-MANUAL.md",
)

RETIRED_ROOT_FILES = (
    "FEATURE-ROADMAP.md",
    "SPECIFICATIONS.md",
)

# Privacy Shield demonstrably uses pull requests for material changes, so the
# repository PR template is an applicable conditional control.
VALIDATION_WORKFLOW = ".github/workflows/validate.yml"

REQUIRED_REPOSITORY_CONTROLS = (
    ".github/PULL_REQUEST_TEMPLATE.md",
    VALIDATION_WORKFLOW,
)

MINIMUM_MEANINGFUL_CHARACTERS = 20


def validate_repository_baseline(root: Path = ROOT) -> list[str]:
    validated: list[str] = []
    problems: list[str] = []

    for relative in (*REQUIRED_ROOT_FILES, *REQUIRED_DOC_FILES, *REQUIRED_REPOSITORY_CONTROLS):
        path = root / relative
        if not path.is_file():
            problems.append(f"missing required repository control: {relative}")
            continue

        try:
            text = path.read_text(encoding="utf-8").strip()
        except UnicodeDecodeError:
            problems.append(f"required repository control is not UTF-8 text: {relative}")
            continue

        if len(text) < MINIMUM_MEANINGFUL_CHARACTERS:
            problems.append(f"required repository control is empty/placeholder-sized: {relative}")
            continue

        if text.lower() in {"todo", "tbd", "placeholder", "coming soon"}:
            problems.append(f"required repository control is a placeholder: {relative}")
            continue

        validated.append(relative)

    for relative in PROHIBITED_ROOT_DOCUMENTS:
        path = root / relative
        if path.exists() or path.is_symlink():
            problems.append(f"prohibited root documentation must not exist: {relative}")

    for relative in RETIRED_ROOT_FILES:
        path = root / relative
        if path.exists() or path.is_symlink():
            problems.append(f"retired repository control must not exist: {relative}")

    workflow_path = root / VALIDATION_WORKFLOW
    if workflow_path.is_file():
        workflow = workflow_path.read_text(encoding="utf-8")
        for token in (
            "persist-credentials: false",
            "Verify exact Privacy Shield revision",
            "EXPECTED_SHA: ${{ github.event.pull_request.head.sha || github.sha }}",
            'run: test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"',
        ):
            if token not in workflow:
                problems.append(f"validation workflow missing exact-revision control: {token}")

    if problems:
        raise SystemExit("Privacy Shield repository baseline validation failed: " + "; ".join(problems))

    return validated


def main() -> None:
    validated = validate_repository_baseline()
    print(
        "Privacy Shield repository documentation baseline passed: "
        f"mandatory_root={len(REQUIRED_ROOT_FILES)}, "
        f"conditional_controls={len(REQUIRED_REPOSITORY_CONTROLS)}, "
        f"retired_root={len(RETIRED_ROOT_FILES)}, "
        f"validated={len(validated)}."
    )


if __name__ == "__main__":
    main()
