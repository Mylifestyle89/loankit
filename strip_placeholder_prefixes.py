import argparse
import json
import re
import zipfile
from pathlib import Path
from typing import Dict, List, Tuple


BRACKET_PLACEHOLDER_RE = re.compile(r"\[([^\]\r\n]{1,200})\]")


def strip_prefix(token: str) -> str:
    token = token.strip()
    if "." not in token:
        return token
    return token.split(".", 1)[1].strip()


def transform_xml(xml_text: str) -> Tuple[str, int, int, List[Dict[str, str]]]:
    total = 0
    changed = 0
    examples: List[Dict[str, str]] = []

    def _repl(match: re.Match) -> str:
        nonlocal total, changed, examples
        total += 1
        original = match.group(1).strip()
        new_token = strip_prefix(original)
        if new_token != original:
            changed += 1
            if len(examples) < 30:
                examples.append({"from": original, "to": new_token})
        return f"[{new_token}]"

    return BRACKET_PLACEHOLDER_RE.sub(_repl, xml_text), total, changed, examples


def process_docx(input_docx: Path, output_docx: Path) -> Dict[str, object]:
    target_parts = {"word/document.xml"}
    scanned_parts: List[str] = []
    total_placeholders = 0
    changed_placeholders = 0
    all_examples: List[Dict[str, str]] = []

    with zipfile.ZipFile(input_docx, "r") as zin:
        names = zin.namelist()
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
                    xml = raw.decode("utf-8")
                    xml, total, changed, examples = transform_xml(xml)
                    total_placeholders += total
                    changed_placeholders += changed
                    for ex in examples:
                        if ex not in all_examples and len(all_examples) < 100:
                            all_examples.append(ex)
                    raw = xml.encode("utf-8")
                zout.writestr(name, raw)

    return {
        "input_docx": str(input_docx),
        "output_docx": str(output_docx),
        "scanned_parts": scanned_parts,
        "total_placeholders_found": total_placeholders,
        "placeholders_changed": changed_placeholders,
        "sample_changes": all_examples,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Strip prefixes before first dot in [placeholder] tokens."
    )
    parser.add_argument("--root", default=".", help="Project root (default: current dir).")
    parser.add_argument(
        "--input",
        default="report_assets/2268.02A.PN BC de xuat cho vay ngan han.docx",
        help="Input DOCX file.",
    )
    parser.add_argument(
        "--output",
        default="report_assets/2268_no_prefix_placeholders.docx",
        help="Output DOCX file.",
    )
    parser.add_argument(
        "--report",
        default="report_assets/strip_prefix_report.json",
        help="JSON report file.",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    input_docx = root / args.input
    output_docx = root / args.output
    report_file = root / args.report

    if not input_docx.exists():
        raise FileNotFoundError(f"Input DOCX not found: {input_docx}")

    result = process_docx(input_docx, output_docx)
    report_file.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== Strip Placeholder Prefixes ===")
    print(f"- input:  {input_docx}")
    print(f"- output: {output_docx}")
    print(f"- report: {report_file}")
    print(f"- total placeholders found: {result['total_placeholders_found']}")
    print(f"- placeholders changed:     {result['placeholders_changed']}")


if __name__ == "__main__":
    main()

