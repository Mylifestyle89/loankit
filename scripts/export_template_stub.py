import argparse
import json
import re
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from report_pipeline.utils import FileLockManager

PLACEHOLDER_CURLY_RE = re.compile(r"\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}")
PLACEHOLDER_BRACKET_RE = re.compile(r"\[([^\]\r\n]{1,120})\]")


def is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    if isinstance(value, list) and len(value) == 0:
        return True
    return False


def load_flat_data(path: Path) -> Dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Flat report data must be a JSON object.")
    return data


def format_number_vn(value: Any) -> str:
    """
    Format numeric values using Vietnamese separators:
    - thousands separator: "."
    - decimal separator: ","
    """
    if isinstance(value, bool):
        return str(value)

    if isinstance(value, int):
        return f"{value:,}".replace(",", ".")

    if isinstance(value, float):
        # Integer-like floats are rendered without decimal part.
        if value.is_integer():
            return f"{int(value):,}".replace(",", ".")

        # Keep up to 6 decimals, then trim trailing zeros.
        s = f"{value:,.6f}"
        s = s.rstrip("0").rstrip(".")
        # Convert US-style separators to VN-style separators.
        # Example: 12,345,678.9 -> 12.345.678,9
        s = s.replace(",", "_").replace(".", ",").replace("_", ".")
        return s

    return str(value)


def stringify_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        return format_number_vn(value)
    if isinstance(value, (bool, str)):
        return str(value)
    # Lists/dicts are kept readable for stub mode.
    return json.dumps(value, ensure_ascii=False)


def resolve_alias_value(
    field: str, flat_data: Dict[str, Any], alias_map: Dict[str, Any]
) -> Optional[Any]:
    if field not in alias_map:
        # Fallback 1: field without prefix can map from prefixed alias keys.
        # Example: "Số tiền vay" -> "HĐTD.Số tiền vay"
        if "." not in field:
            candidates = sorted(
                k for k in alias_map.keys() if isinstance(k, str) and k.endswith("." + field)
            )
            for k in candidates:
                value = resolve_alias_value(k, flat_data, alias_map)
                if not is_empty(value):
                    return value
        return None

    spec = alias_map[field]
    if isinstance(spec, str):
        return flat_data.get(spec)

    if isinstance(spec, list):
        for candidate in spec:
            if isinstance(candidate, str) and candidate in flat_data:
                return flat_data[candidate]
        return None

    if isinstance(spec, dict):
        if "literal" in spec:
            lit = spec["literal"]
            if lit == "$TODAY_DDMMYYYY":
                return datetime.now().strftime("%d/%m/%Y")
            if lit == "$TODAY_DD":
                return datetime.now().strftime("%d")
            if lit == "$TODAY_MM":
                return datetime.now().strftime("%m")
            if lit == "$TODAY_YYYY":
                return datetime.now().strftime("%Y")
            return lit
        if "from" in spec:
            src = spec["from"]
            if isinstance(src, str):
                return flat_data.get(src)
            if isinstance(src, list):
                for candidate in src:
                    if isinstance(candidate, str) and candidate in flat_data:
                        return flat_data[candidate]
    return None


def replace_placeholders_in_xml(
    xml_text: str, flat_data: Dict[str, Any], alias_map: Dict[str, Any]
) -> Tuple[str, List[str], List[str]]:
    used_fields: List[str] = []
    missing_fields: List[str] = []

    def _repl(match: re.Match) -> str:
        field = match.group(1)
        if field in flat_data:
            used_fields.append(field)
            return stringify_value(flat_data[field])
        alias_value = resolve_alias_value(field, flat_data, alias_map)
        if not is_empty(alias_value):
            used_fields.append(field)
            return stringify_value(alias_value)
        missing_fields.append(field)
        return match.group(0)

    replaced = PLACEHOLDER_CURLY_RE.sub(_repl, xml_text)
    replaced = PLACEHOLDER_BRACKET_RE.sub(_repl, replaced)
    return replaced, used_fields, missing_fields


def export_stub(
    template_docx: Path,
    flat_data: Dict[str, Any],
    alias_map: Dict[str, Any],
    output_docx: Path,
) -> Dict[str, Any]:
    target_parts = {"word/document.xml"}
    used_fields_all: List[str] = []
    missing_fields_all: List[str] = []
    scanned_parts: List[str] = []

    with zipfile.ZipFile(template_docx, "r") as zin:
        names = zin.namelist()
        # Include header/footer parts if present.
        for name in names:
            if name.startswith("word/header") and name.endswith(".xml"):
                target_parts.add(name)
            if name.startswith("word/footer") and name.endswith(".xml"):
                target_parts.add(name)

        with zipfile.ZipFile(output_docx, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for name in names:
                raw = zin.read(name)
                if name in target_parts:
                    scanned_parts.append(name)
                    text = raw.decode("utf-8")
                    replaced, used_fields, missing_fields = replace_placeholders_in_xml(
                        text, flat_data, alias_map
                    )
                    used_fields_all.extend(used_fields)
                    missing_fields_all.extend(missing_fields)
                    raw = replaced.encode("utf-8")
                zout.writestr(name, raw)

    used_unique = sorted(set(used_fields_all))
    missing_unique = sorted(set(missing_fields_all))

    return {
        "template_docx": str(template_docx),
        "output_docx": str(output_docx),
        "scanned_parts": scanned_parts,
        "placeholders_replaced_count": len(used_fields_all),
        "placeholders_replaced_unique_count": len(used_unique),
        "placeholders_missing_count": len(missing_fields_all),
        "placeholders_missing_unique_count": len(missing_unique),
        "used_fields": used_unique,
        "missing_fields": missing_unique,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Stub exporter: replace {{field.path}} placeholders in DOCX."
    )
    parser.add_argument("--root", default=".", help="Project root (default: current dir).")
    parser.add_argument(
        "--template",
        default="report_assets/Template.docx",
        help="Template DOCX filename (default: report_assets/Template.docx).",
    )
    parser.add_argument(
        "--flat-json",
        default="report_assets/generated/report_draft_flat.json",
        help="Flat report JSON filename (default: report_assets/generated/report_draft_flat.json).",
    )
    parser.add_argument(
        "--output",
        default="report_assets/report_preview.docx",
        help="Output DOCX filename (default: report_assets/report_preview.docx).",
    )
    parser.add_argument(
        "--report",
        default="report_assets/template_export_report.json",
        help="Export report JSON filename (default: report_assets/template_export_report.json).",
    )
    parser.add_argument(
        "--alias-map",
        default="report_assets/placeholder_alias_2268.json",
        help="Optional alias JSON file for placeholder-to-field mapping.",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    template_docx = root / args.template
    flat_json = root / args.flat_json
    output_docx = root / args.output
    report_json = root / args.report
    alias_map_file = (root / args.alias_map) if args.alias_map else None

    if not template_docx.exists():
        raise FileNotFoundError(f"Template file not found: {template_docx}")
    if not flat_json.exists():
        raise FileNotFoundError(f"Flat data file not found: {flat_json}")

    flat_data = load_flat_data(flat_json)
    alias_map: Dict[str, Any] = {}
    if alias_map_file:
        if not alias_map_file.exists():
            raise FileNotFoundError(f"Alias map file not found: {alias_map_file}")
        alias_map = json.loads(alias_map_file.read_text(encoding="utf-8"))

    lock_manager = FileLockManager(root_dir=root)
    lock_manager.acquire_lock("report_assets")
    try:
        export_result = export_stub(template_docx, flat_data, alias_map, output_docx)
        report_json.write_text(json.dumps(export_result, ensure_ascii=False, indent=2), encoding="utf-8")
    finally:
        lock_manager.release_lock("report_assets")

    print("=== Template Export Stub Completed ===")
    print(f"- template: {template_docx}")
    print(f"- output:   {output_docx}")
    print(f"- report:   {report_json}")
    print(f"- replaced placeholders: {export_result['placeholders_replaced_count']} "
          f"(unique: {export_result['placeholders_replaced_unique_count']})")
    print(f"- missing placeholders:  {export_result['placeholders_missing_count']} "
          f"(unique: {export_result['placeholders_missing_unique_count']})")


if __name__ == "__main__":
    main()

