import html
import json
import zipfile
from pathlib import Path
from typing import List, Tuple


ROOT = Path(__file__).resolve().parent
TEMPLATE = ROOT / "Template.docx"
SEED = ROOT / "template_placeholders_seed.txt"
OUTPUT = ROOT / "Template_placeholder_trial.docx"
REPORT = ROOT / "template_placeholder_injection_report.json"


def parse_seed(seed_text: str) -> List[str]:
    fields: List[str] = []
    for line in seed_text.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        fields.append(s)
    return fields


def make_paragraph(text: str, bold: bool = False) -> str:
    esc = html.escape(text)
    if bold:
        return (
            "<w:p><w:r><w:rPr><w:b/></w:rPr>"
            f"<w:t xml:space=\"preserve\">{esc}</w:t></w:r></w:p>"
        )
    return f"<w:p><w:r><w:t xml:space=\"preserve\">{esc}</w:t></w:r></w:p>"


def build_placeholder_block(fields: List[str]) -> str:
    lines = [make_paragraph("PHU LUC TEST PLACEHOLDER - AUTO INSERT", bold=True)]
    lines.append(make_paragraph("Ban nay de review va chinh tay, khong phai ban phat hanh."))
    for f in fields:
        lines.append(make_paragraph(f"{f}: {f}"))
    return "".join(lines)


def inject_document_xml(xml_text: str, block_xml: str) -> Tuple[str, bool]:
    marker = "</w:body>"
    if marker not in xml_text:
        return xml_text, False
    return xml_text.replace(marker, f"{block_xml}{marker}", 1), True


def main() -> None:
    if not TEMPLATE.exists():
        raise FileNotFoundError(f"Template not found: {TEMPLATE}")
    if not SEED.exists():
        raise FileNotFoundError(f"Seed file not found: {SEED}")

    fields = parse_seed(SEED.read_text(encoding="utf-8"))
    block_xml = build_placeholder_block(fields)

    injected = False
    with zipfile.ZipFile(TEMPLATE, "r") as zin:
        with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for name in zin.namelist():
                raw = zin.read(name)
                if name == "word/document.xml":
                    xml = raw.decode("utf-8")
                    xml, injected = inject_document_xml(xml, block_xml)
                    raw = xml.encode("utf-8")
                zout.writestr(name, raw)

    report = {
        "template": str(TEMPLATE),
        "output": str(OUTPUT),
        "seed_count": len(fields),
        "injected": injected,
        "note": "Placeholders are appended as a test appendix block.",
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== Placeholder Injection Trial ===")
    print(f"- template: {TEMPLATE}")
    print(f"- output:   {OUTPUT}")
    print(f"- injected: {injected}")
    print(f"- placeholders seeded: {len(fields)}")
    print(f"- report:   {REPORT}")


if __name__ == "__main__":
    main()

