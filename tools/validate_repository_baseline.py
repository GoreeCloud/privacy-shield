from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_ROOT_FILES = (
    "README.md",
    "SPECIFICATIONS.md",
    "FEATURES.md",
    "IMPLEMENTED-FEATURES.md",
    "PLANNED-FEATURES.md",
    "CHANGELOGS.md",
    "BENEFITS.md",
    "COMPETITIVE-OBJECTIVES.md",
    "BRANDING.md",
    "USER-MANUAL.md",
    "PRIVACY POLICY.md",
    "NOTES.md",
    "SECURITY.md",
    ".gitignore",
    ".editorconfig",
    "goreecloud.platform.yaml",
)

RETIRED_ROOT_FILES = (
    "FEATURE-ROADMAP.md",
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

    for relative in (*REQUIRED_ROOT_FILES, *REQUIRED_REPOSITORY_CONTROLS):
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

    for relative in RETIRED_ROOT_FILES:
        if (root / relative).exists():
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
