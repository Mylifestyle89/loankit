import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from report_pipeline.resolver import (
    is_empty,
    load_sources,
    resolve_data_path,
    resolve_xlsm_path,
)


def set_nested(target: Dict[str, Any], dotted_key: str, value: Any) -> None:
    parts = dotted_key.split(".")
    cursor = target
    for part in parts[:-1]:
        if part not in cursor or not isinstance(cursor[part], dict):
            cursor[part] = {}
        cursor = cursor[part]
    cursor[parts[-1]] = value


def normalize_currency_vnd(value: Any) -> Any:
    if isinstance(value, (int, float)):
        return value
    if not isinstance(value, str):
        return value
    cleaned = value.replace(".", "").replace(",", ".").replace(" ", "").strip()
    if cleaned == "":
        return value
    try:
        return float(cleaned)
    except ValueError:
        return value


def normalize_percent_vn(value: Any) -> Any:
    if isinstance(value, (int, float)):
        return value
    if not isinstance(value, str):
        return value
    cleaned = value.replace("%", "").replace(".", "").replace(",", ".").replace(" ", "")
    if cleaned == "":
        return value
    try:
        return float(cleaned)
    except ValueError:
        return value


def apply_normalizer(value: Any, normalizer_name: str) -> Any:
    if normalizer_name == "currency_vnd":
        return normalize_currency_vnd(value)
    if normalizer_name == "percent_vn":
        return normalize_percent_vn(value)
    return value


def resolve_field(client: Dict[str, Any], workbook, mapping_item: Dict[str, Any]) -> Dict[str, Any]:
    field = mapping_item["template_field"]
    status = mapping_item.get("status", "UNKNOWN")
    normalizer = mapping_item.get("normalizer")

    if status == "MISSING":
        return {
            "field": field,
            "resolved": False,
            "status": status,
            "value_raw": None,
            "value_normalized": None,
            "resolved_from": None,
        }

    for src in mapping_item.get("sources", []):
        src_name = src.get("source")
        src_path = src.get("path", "")
        value = None
        if src_name == "data_bk":
            value = resolve_data_path(client, src_path)
        elif src_name == "xlsm_hmtd":
            value = resolve_xlsm_path(workbook, src_path)

        if not is_empty(value):
            normalized_value = apply_normalizer(value, normalizer) if normalizer else value
            return {
                "field": field,
                "resolved": True,
                "status": status,
                "value_raw": value,
                "value_normalized": normalized_value,
                "resolved_from": f"{src_name}:{src_path}",
            }

    return {
        "field": field,
        "resolved": False,
        "status": status,
        "value_raw": None,
        "value_normalized": None,
        "resolved_from": None,
    }


def flatten_dict(data: Dict[str, Any], parent_key: str = "") -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in data.items():
        new_key = f"{parent_key}.{k}" if parent_key else k
        if isinstance(v, dict):
            out.update(flatten_dict(v, new_key))
        else:
            out[new_key] = v
    return out


def build_report_draft(
    root: Path,
    mapping_rel_path: str = "mapping_master.json",
    sources_root: Optional[Path] = None,
) -> Dict[str, Any]:
    mapping_file = root / mapping_rel_path
    mapping = json.loads(mapping_file.read_text(encoding="utf-8"))
    src_root = sources_root if sources_root is not None else root
    src = load_sources(src_root, mapping)
    client = src["client"]
    workbook = src["workbook"]

    report_nested: Dict[str, Any] = {}
    resolution_log: List[Dict[str, Any]] = []
    unresolved_fields: List[str] = []
    declared_missing_fields: List[str] = []

    for item in mapping["mappings"]:
        resolved = resolve_field(client, workbook, item)
        resolution_log.append(resolved)

        if resolved["status"] == "MISSING":
            declared_missing_fields.append(resolved["field"])
            continue

        if resolved["resolved"]:
            set_nested(report_nested, resolved["field"], resolved["value_normalized"])
        else:
            unresolved_fields.append(resolved["field"])

    report_flat = flatten_dict(report_nested)

    output = {
        "meta": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "mapping_file": str(mapping_file),
            "summary": {
                "total_fields": len(mapping["mappings"]),
                "resolved_fields": len([x for x in resolution_log if x["resolved"]]),
                "unresolved_fields": len(unresolved_fields),
                "declared_missing_fields": len(declared_missing_fields),
            },
        },
        "report_draft": report_nested,
        "report_draft_flat": report_flat,
        "unresolved_fields": unresolved_fields,
        "declared_missing_fields": declared_missing_fields,
        "resolution_log": resolution_log,
    }
    return output

