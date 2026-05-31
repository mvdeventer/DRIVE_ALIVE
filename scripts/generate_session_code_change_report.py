#!/usr/bin/env python3
"""Generate a minimal DOCX report from docs/session-code-change-report.md.

This script uses only the Python standard library so it can run inside the
existing repo environment without adding dependencies.
"""

from __future__ import annotations

import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_MD = REPO_ROOT / "docs" / "session-code-change-report.md"
OUTPUT_DOCX = REPO_ROOT / "docs" / "session-code-change-report.docx"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"


def read_lines() -> list[str]:
    text = SOURCE_MD.read_text(encoding="utf-8")
    return text.splitlines()


def paragraph(text: str = "", style: str | None = None) -> str:
    props = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    if not text:
        return f"<w:p>{props}</w:p>"
    # Preserve readable plain text with basic hyperlinks displayed as text.
    text = escape(text)
    return (
        f"<w:p>{props}<w:r><w:t xml:space=\"preserve\">{text}</w:t></w:r></w:p>"
    )


def bullet(text: str) -> str:
    return (
        '<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr>'
        f'<w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'
    )


def heading(text: str, level: int) -> str:
    style = f"Heading{min(level, 9)}"
    return paragraph(text, style=style)


def table(rows: list[list[str]]) -> str:
    def cell(text: str) -> str:
        return (
            '<w:tc><w:tcPr><w:tcW w:w="4320" w:type="dxa"/></w:tcPr>'
            f'<w:p><w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'
            '</w:tc>'
        )

    tr_rows = []
    for row in rows:
        tr_rows.append("<w:tr>" + "".join(cell(col) for col in row) + "</w:tr>")
    return (
        '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>'
        + "".join(tr_rows)
        + '</w:tbl>'
    )


class MarkdownDocxBuilder:
    def __init__(self) -> None:
        self.blocks: list[str] = []
        self.table_rows: list[list[str]] = []
        self.code_lines: list[str] = []
        self.in_code = False

    def flush_table(self) -> None:
        if self.table_rows:
            self.blocks.append(table(self.table_rows))
        self.table_rows = []

    def flush_code(self) -> None:
        if self.code_lines:
            for line in self.code_lines:
                self.blocks.append(paragraph(line))
        self.code_lines = []

    def append_heading(self, line: str) -> None:
        self.flush_table()
        level = len(line) - len(line.lstrip("#"))
        self.blocks.append(heading(line[level:].strip(), level))

    def append_bullet(self, line: str) -> None:
        self.flush_table()
        self.blocks.append(bullet(line[2:].strip()))

    def append_table_row(self, line: str) -> None:
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if all(re.fullmatch(r"-+", cell) for cell in cells if cell):
            return
        self.table_rows.append(cells)

    def append_code_line(self, line: str) -> None:
        self.code_lines.append(line)

    def append_paragraph(self, line: str) -> None:
        self.flush_table()
        self.blocks.append(paragraph(line))

    def finish(self) -> str:
        self.flush_code()
        self.flush_table()
        return "\n".join(self.blocks)


def process_markdown_line(builder: MarkdownDocxBuilder, line: str) -> None:
    if line.startswith("```"):
        if builder.in_code:
            builder.flush_code()
        builder.in_code = not builder.in_code
        return

    if builder.in_code:
        builder.append_code_line(line)
        return

    if not line.strip():
        builder.flush_table()
        builder.blocks.append(paragraph())
        return

    if line.startswith("# "):
        builder.append_heading(line)
        return

    if line.startswith("- "):
        builder.append_bullet(line)
        return

    if re.match(r"^\|.*\|$", line):
        builder.append_table_row(line)
        return

    builder.append_paragraph(line)


def build_document_xml(lines: list[str]) -> str:
    builder = MarkdownDocxBuilder()

    for raw in lines:
        process_markdown_line(builder, raw.rstrip())

    return builder.finish()


def build_docx(document_xml: str) -> None:
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""

    rels = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{PKG_REL_NS}">
  <Relationship Id="rId1" Type="{R_NS}/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    doc_rels = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{PKG_REL_NS}"></Relationships>"""

    document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="{W_NS}" xmlns:r="{R_NS}">
  <w:body>
    {document_xml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>"""

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    core = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>DRIVE_ALIVE Session Code Change Report</dc:title>
  <dc:subject>Session summary and flow map</dc:subject>
  <dc:creator>GitHub Copilot</dc:creator>
  <cp:lastModifiedBy>GitHub Copilot</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>"""

    app = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
</Properties>"""

    with zipfile.ZipFile(OUTPUT_DOCX, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/_rels/document.xml.rels", doc_rels)
        zf.writestr("word/document.xml", document)
        zf.writestr("docProps/core.xml", core)
        zf.writestr("docProps/app.xml", app)


def main() -> None:
    lines = read_lines()
    xml = build_document_xml(lines)
    build_docx(xml)
    print(f"Wrote {OUTPUT_DOCX}")


if __name__ == "__main__":
    main()
