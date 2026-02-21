import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from openpyxl import load_workbook

from test_mapping import is_empty, resolve_data_path, resolve_xlsm_path


ROOT = Path(__file__).resolve().parent
MAPPING_FILE = ROOT / "mapping_master.json"
OUTPUT_FILE = ROOT / "report_draft.json"


def set_nested(target: Dict[str, Any], dotted_key: str, value: Any) -> None:
    parts = dotted_key.split(".")
    cursor = target
    for part in parts[:-1]:
        if part not in cursor or not isinstance(cursor[part], dict):
            cursor[part] = {}
        cursor = cursor[part]
    cursor[parts[-1]] = value


def resolve_field(client: Dict[str, Any], wb, mapping_item: Dict[str, Any]) -> Dict[str, Any]:
    field = mapping_item["template_field"]
    status = mapping_item.get("status", "UNKNOWN")
    if status == "MISSING":
        return {
            "field": field,
            "resolved": False,
            "status": status,
            "value": None,
            "resolved_from": None,
        }

    for src in mapping_item.get("sources", []):
        src_name = src.get("source")
        src_path = src.get("path", "")
        value = None

        if src_name == "data_bk":
            value = resolve_data_path(client, src_path)
        elif src_name == "xlsm_hmtd":
            value = resolve_xlsm_path(wb, src_path)

        if not is_empty(value):
            return {
                "field": field,
                "resolved": True,
                "status": status,
                "value": value,
                "resolved_from": f"{src_name}:{src_path}",
            }

    return {
        "field": field,
        "resolved": False,
        "status": status,
        "value": None,
        "resolved_from": None,
    }


def main() -> None:
    mapping = json.loads(MAPPING_FILE.read_text(encoding="utf-8"))
    
    client = {} # No longer reading from data.bk

    xlsm_path = ROOT / mapping["sources"]["xlsm_hmtd"]["file"]
    wb = None
    if xlsm_path.exists():
        wb = load_workbook(xlsm_path, data_only=True, read_only=True)

    report: Dict[str, Any] = {}
    resolution_logs: List[Dict[str, Any]] = []
    unresolved_fields: List[str] = []
    missing_declared_fields: List[str] = []

    for item in mapping["mappings"]:
        result = resolve_field(client, wb, item)
        resolution_logs.append(result)

        field = result["field"]
        if result["status"] == "MISSING":
            missing_declared_fields.append(field)
            continue

        if result["resolved"]:
            set_nested(report, field, result["value"])
        else:
            unresolved_fields.append(field)

    output = {
        "meta": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "mapping_file": MAPPING_FILE.name,
            "input_sources": {
                "xlsm_hmtd": mapping["sources"]["xlsm_hmtd"]["file"],
            },
            "summary": {
                "total_fields": len(mapping["mappings"]),
                "resolved_fields": len([x for x in resolution_logs if x["resolved"]]),
                "unresolved_fields": len(unresolved_fields),
                "declared_missing_fields": len(missing_declared_fields),
            },
        },
        "report_draft": report,
        "unresolved_fields": unresolved_fields,
        "declared_missing_fields": missing_declared_fields,
        "resolution_log": resolution_logs,
    }

    OUTPUT_FILE.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Generated: {OUTPUT_FILE}")
    print("Summary:")
    print(f"- Total fields: {output['meta']['summary']['total_fields']}")
    print(f"- Resolved: {output['meta']['summary']['resolved_fields']}")
    print(f"- Unresolved: {output['meta']['summary']['unresolved_fields']}")
    print(f"- Declared missing: {output['meta']['summary']['declared_missing_fields']}")


if __name__ == "__main__":
    main()
