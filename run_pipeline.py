import argparse
import json
from pathlib import Path

from report_pipeline.builder import build_report_draft
from report_pipeline.utils import FileLockManager
from report_pipeline.validator import validate_report


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build report draft and validate mapping output."
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Project root path (default: current directory).",
    )
    parser.add_argument(
        "--mapping",
        default="report_assets/mapping_master.json",
        help="Mapping JSON path relative to root (default: report_assets/mapping_master.json).",
    )
    parser.add_argument(
        "--output-dir",
        default="report_assets",
        help="Output directory relative to root (default: report_assets).",
    )
    parser.add_argument(
        "--sources-root",
        default=".",
        help="Source data root relative to root (default: .).",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    sources_root = (root / args.sources_root).resolve()
    output = build_report_draft(root, mapping_rel_path=args.mapping, sources_root=sources_root)
    validation = validate_report(output)

    output_dir = (root / args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    draft_file = output_dir / "report_draft.json"
    draft_flat_file = output_dir / "report_draft_flat.json"
    validation_file = output_dir / "validation_report.json"

    lock_manager = FileLockManager(root_dir=root)
    lock_manager.acquire_lock("report_assets")
    try:
        draft_file.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
        draft_flat_file.write_text(
            json.dumps(output.get("report_draft_flat", {}), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        validation_file.write_text(
            json.dumps(validation, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    finally:
        lock_manager.release_lock("report_assets")

    summary = output.get("meta", {}).get("summary", {})
    print("=== Pipeline Completed ===")
    print(f"- report_draft.json: {draft_file}")
    print(f"- report_draft_flat.json: {draft_flat_file}")
    print(f"- validation_report.json: {validation_file}")
    print("- Build summary:")
    print(f"  - total_fields: {summary.get('total_fields', 0)}")
    print(f"  - resolved_fields: {summary.get('resolved_fields', 0)}")
    print(f"  - unresolved_fields: {summary.get('unresolved_fields', 0)}")
    print(f"  - declared_missing_fields: {summary.get('declared_missing_fields', 0)}")
    print("- Validation summary:")
    print(f"  - is_valid: {validation.get('is_valid')}")
    print(f"  - errors_count: {validation.get('errors_count')}")
    print(f"  - warnings_count: {validation.get('warnings_count')}")


if __name__ == "__main__":
    main()

