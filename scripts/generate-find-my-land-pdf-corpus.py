from __future__ import annotations

from io import BytesIO
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "tests" / "fixtures" / "find-my-land"
OUTPUT.mkdir(parents=True, exist_ok=True)

FONT_PATH = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_NAME = "CorpusArial"
pdfmetrics.registerFont(TTFont(FONT_NAME, str(FONT_PATH)))


def make_text_pdf(name: str, lines: list[str], *, rtl: bool = False) -> None:
    target = OUTPUT / name
    pdf = canvas.Canvas(str(target), pagesize=A4, pageCompression=0)
    width, height = A4
    pdf.setTitle(f"Safe Find My Land fixture: {name}")
    pdf.setAuthor("AkarProMax test corpus")
    pdf.setFont(FONT_NAME, 13)
    y = height - 64
    for line in lines:
        if rtl:
            pdf.drawRightString(width - 54, y, line, direction="rtl", shaping=True)
        else:
            pdf.drawString(54, y, line)
        y -= 28
    pdf.showPage()
    pdf.save()


def make_arabic_pdf() -> None:
    target = OUTPUT / "02-arabic-wgs84.pdf"
    pdf = canvas.Canvas(str(target), pagesize=A4, pageCompression=0)
    width, height = A4
    pdf.setTitle("Safe Arabic Find My Land fixture")
    pdf.setAuthor("AkarProMax test corpus")

    header_path = OUTPUT / ".arabic-header.png"
    node = shutil.which("node") or "node"
    subprocess.run(
        [
            node,
            "--import=data:text/javascript,import%20os%20from%20'node:os';os.userInfo=()=>({username:'codex',uid:-1,gid:-1,shell:null,homedir:'C:/Users/zak'})",
            str(ROOT / "scripts" / "render-find-my-land-arabic-header.mjs"),
            str(header_path),
        ],
        cwd=ROOT,
        check=True,
    )
    pdf.drawImage(ImageReader(str(header_path)), 54, height - 190, width=width - 108, height=90)
    header_path.unlink(missing_ok=True)

    # A searchable Arabic text layer models real scanned Arabic PDFs while the
    # rendered header above remains correctly shaped and RTL.
    pdf.setFillColorRGB(1, 1, 1)
    pdf.setFont(FONT_NAME, 8)
    pdf.drawString(54, 20, "تقرير مساحي قطعة أرض إحداثيات")
    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont(FONT_NAME, 13)
    pdf.drawString(54, height - 225, "SAFE ARABIC LAND SURVEY REPORT - WGS84")
    for index, line in enumerate([
        "P1 24.713600 N 46.675300 E",
        "P2 24.713900 N 46.675300 E",
        "P3 24.713900 N 46.675700 E",
        "P4 24.713600 N 46.675700 E",
    ]):
        pdf.drawString(54, height - 265 - index * 28, line)
    pdf.showPage()
    pdf.save()


make_text_pdf(
    "01-text-wgs84.pdf",
    [
        "SAFE SYNTHETIC LAND SURVEY - NO PERSONAL DATA",
        "Coordinate System: WGS84",
        "Coordinates (latitude longitude)",
        "P1 24.713600 46.675300",
        "P2 24.713900 46.675300",
        "P3 24.713900 46.675700",
        "P4 24.713600 46.675700",
    ],
)

make_arabic_pdf()

make_text_pdf(
    "03-explicit-utm.pdf",
    [
        "SAFE SYNTHETIC CADASTRAL SURVEY",
        "Coordinate Reference System: UTM Zone 38N",
        "Boundary coordinates",
        "P1 38N 669000.000 2734000.000",
        "P2 38N 669040.000 2734000.000",
        "P3 38N 669040.000 2734030.000",
        "P4 38N 669000.000 2734030.000",
    ],
)

make_text_pdf(
    "04-zone-less-utm.pdf",
    [
        "SAFE SYNTHETIC LAND SURVEY - ZONE INTENTIONALLY OMITTED",
        "LINE NORTHING EASTING DIST (m)",
        "1 2 2533105.07 559322.22 20.00",
        "2 3 2533124.65 559326.26 30.00",
        "3 4 2533118.59 559355.64 20.00",
        "4 1 2533099.00 559351.60 30.00",
        "AREA = 600 SQ. M.",
    ],
)

make_text_pdf(
    "05-multiple-number-groups.pdf",
    [
        "SAFE SYNTHETIC PROPERTY PROJECT SCOPE",
        "This document contains unrelated numeric groups.",
        "Budget ratios: 41.12947 19.90105",
        "Milestone values: 24.75000 46.70000",
        "Invoice values: 30.25000 55.12500",
        "Progress values: 22.50000 48.25000",
    ],
)

make_text_pdf(
    "06-incomplete-two-points.pdf",
    [
        "SAFE SYNTHETIC INCOMPLETE LAND SURVEY",
        "Coordinates WGS84 - only two boundary points are present",
        "P1 24.713600 N 46.675300 E",
        "P2 24.713900 N 46.675300 E",
    ],
)

image = Image.new("RGB", (1240, 1754), "white")
draw = ImageDraw.Draw(image)
font = ImageFont.truetype(str(FONT_PATH), 38)
draw.rectangle((100, 150, 1140, 1500), outline="#173b74", width=5)
draw.text((180, 300), "SCANNED IMAGE-ONLY TEST DOCUMENT", fill="#173b74", font=font)
draw.text((180, 380), "NO EXTRACTABLE PDF TEXT", fill="#173b74", font=font)
buffer = BytesIO()
image.save(buffer, format="PNG")
buffer.seek(0)
pdf = canvas.Canvas(str(OUTPUT / "07-no-extractable-text.pdf"), pagesize=A4)
pdf.drawImage(ImageReader(buffer), 0, 0, width=A4[0], height=A4[1])
pdf.showPage()
pdf.save()

(OUTPUT / "08-invalid-pdf.pdf").write_bytes(
    b"%PDF-1.4\n% intentionally malformed safe test fixture\n1 0 obj << /Type /Catalog >>\n"
)

print(f"Generated 8 safe Find My Land PDF fixtures in {OUTPUT}")
