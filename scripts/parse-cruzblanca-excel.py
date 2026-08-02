#!/usr/bin/env python3
"""Parsea Excel Cruz Blanca (RM / Regiones) alineado con PDFs locales."""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from datetime import date, datetime
from pathlib import Path

import openpyxl

ISAPRE_NAME = "Cruz Blanca"
DEFAULT_FOLDER = (
    Path(__file__).resolve().parent.parent / "storage" / "planes-pdf" / "cruz blanca"
)
OUTPUT_PATH = Path(__file__).resolve().parent / ".cruzblanca-plans-parsed.json"

RM_ZONES = [
    "rm-metropolitana",
    "rm-norte",
    "rm-sur",
    "rm-oriente",
    "rm-poniente",
    "rm-centro",
]
REGION_ZONES = ["norte", "octava"]

SKIP_CLINIC_LABELS = {"hospitalario", "ambulatorio"}
PERCENT_LINE = re.compile(r"^(\d+)%$")
CODE_PATTERN = re.compile(r"^[A-Z0-9-]+$")

CLINIC_NAME_TO_ID: dict[str, str] = {
    "Centros Médicos Red UC Christus": "red-uc-christus",
    "Clínica Alemana": "cl-alemana-santiago",
    "Clínica Alemana de Osorno": "cl-alemana-osorno",
    "Clínica Alemana de Temuco": "cl-alemana-temuco",
    "Clínica Alemana de Valdivia": "cl-alemana-valdivia",
    "Clínica Andes Salud Chillán": "cl-andes-salud-chillan",
    "Clínica Andes Salud Concepción": "cl-andes-salud-concepcion",
    "Clínica Andes Salud El Loa": "cl-andes-salud-el-loa",
    "Clínica Andes Salud Puerto Montt": "cl-andes-salud-puerto-montt",
    "Clínica Biobío": "cl-biobio",
    "Clínica Bupa Antofagasta": "cl-bupa-antofagasta",
    "Clínica Bupa Reñaca": "cl-bupa-renaca",
    "Clínica Bupa Santiago": "cl-bupa-santiago",
    "Clínica Ciudad del Mar": "cl-ciudad-del-mar",
    "Clínica Cordillera": "cl-cordillera",
    "Clínica Dávila": "cl-davila",
    "Clínica Hospital del Profesor": "cl-hospital-del-profesor",
    "Clínica Indisa": "cl-indisa-providencia-anexo",
    "Clínica Indisa Maipú": "cl-indisa-maipu",
    "Clínica Isamédica": "integramedica",
    "Clínica Juan Pablo II": "cl-juan-pablo-ii",
    "Clínica Las Condes": "cl-las-condes",
    "Clínica Los Carrera InterClínica": "cl-los-carrera",
    "Clínica Los Leones": "cl-los-leones",
    "Clínica Meds": "cl-meds",
    "Clínica Puerto Varas": "cl-puerto-varas",
    "Clínica RedSalud Elqui": "cl-redsalud-elqui",
    "Clínica RedSalud Iquique": "cl-redsalud-iquique",
    "Clínica RedSalud Magallanes": "cl-redsalud-magallanes",
    "Clínica RedSalud Mayor Temuco": "cl-redsalud-mayor",
    "Clínica RedSalud Rancagua": "cl-redsalud-rancagua",
    "Clínica RedSalud Vitacura": "cl-redsalud-vitacura",
    "Clínica San Carlos de Apoquindo": "cl-san-carlos",
    "Clínica San José InterClínica": "cl-san-jose-interclinica",
    "Clínica Santa María": "cl-santa-maria",
    "Clínica Tarapacá InterClínica": "cl-tarapaca-interclinica",
    "Clínica Universidad de Los Andes": "cl-univ-andes",
    "Hospital Clínico UC": "hosp-clinico-uc",
    "Hospital Clínico Universidad de Chile": "hosp-clinico-uch",
    "Hospital Clínico Viña del Mar": "hosp-vina-del-mar",
    "Integramédica": "integramedica",
}


def slugify_clinic_id(name: str) -> str:
    normalized = (
        unicodedata.normalize("NFKD", name)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return slug or "clinica"


def resolve_clinic_id(clinic_name: str) -> str | None:
    cleaned = clinic_name.strip().strip(",")
    if cleaned.lower() in SKIP_CLINIC_LABELS:
        return None
    if cleaned in CLINIC_NAME_TO_ID:
        return CLINIC_NAME_TO_ID[cleaned]
    slug = slugify_clinic_id(cleaned)
    CLINIC_NAME_TO_ID[cleaned] = slug
    print(f"Clínica nueva (slug auto): {cleaned!r} -> {slug}", file=sys.stderr)
    return slug


def parse_price(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", ".")
    match = re.search(r"\d+(?:\.\d+)?", text)
    if match:
        return float(match.group(0))
    return None


def normalize_code(value) -> str | None:
    if value is None:
        return None
    code = str(value).strip().replace("\n", "").upper()
    if not code or code == "CODIGO":
        return None
    if not CODE_PATTERN.match(code):
        return None
    return code


def parse_coverage(text: str, coverage_type: str) -> list[dict]:
    if not text:
        return []

    lines = [line.strip().strip(",") for line in str(text).split("\n")]
    lines = [line for line in lines if line]

    entries: list[dict] = []
    index = 0

    while index < len(lines):
        match = PERCENT_LINE.match(lines[index])
        if not match:
            index += 1
            continue

        percentage = int(match.group(1))
        index += 1
        if index >= len(lines):
            break

        clinic_name = lines[index]
        index += 1

        clinic_id = resolve_clinic_id(clinic_name)
        if not clinic_id:
            continue

        entries.append(
            {
                "clinic_id": clinic_id,
                "clinic_name": clinic_name,
                "percentage": percentage,
                "type": coverage_type,
            }
        )

    return entries


def parse_simple_workbook(xlsx_path: Path, zones: list[str]) -> dict[str, dict]:
    workbook = openpyxl.load_workbook(xlsx_path, data_only=True)
    worksheet = workbook.active
    plans: dict[str, dict] = {}

    for row in worksheet.iter_rows(min_row=1, values_only=True):
        code_raw, price_raw, hospitalario_raw, ambulatorio_raw = (row + (None,) * 4)[:4]
        code = normalize_code(code_raw)
        if not code:
            continue

        base_price_uf = parse_price(price_raw)
        if base_price_uf is None:
            print(f"Plan omitido por precio inválido: {code} ({price_raw!r})", file=sys.stderr)
            continue

        coverage: list[dict] = []
        if hospitalario_raw:
            coverage.extend(parse_coverage(hospitalario_raw, "hospitalaria"))
        if ambulatorio_raw:
            coverage.extend(parse_coverage(ambulatorio_raw, "ambulatoria"))

        if code in plans:
            print(f"Plan duplicado en Excel omitido: {code}", file=sys.stderr)
            continue

        plans[code] = {
            "isapre": ISAPRE_NAME,
            "plan_name": f"Cruz Blanca {code}",
            "unique_code": code,
            "base_price_uf": base_price_uf,
            "has_top": False,
            "additional_notes": None,
            "pdf_url": None,
            "pdf_public_id": None,
            "zones": list(zones),
            "coverage": coverage,
        }

    return plans


def find_file(directory: Path, patterns: list[str]) -> Path | None:
    for pattern in patterns:
        matches = sorted(directory.glob(pattern))
        if matches:
            return matches[-1]
    return None


def normalize_pdf_code(filename: str) -> str:
    stem = Path(filename).stem.upper()
    return re.sub(r"\s*\(\d+\)$", "", stem).strip()


def collect_pdf_codes(*pdf_dirs: Path) -> set[str]:
    codes: set[str] = set()
    for pdf_dir in pdf_dirs:
        if not pdf_dir or not pdf_dir.is_dir():
            continue
        for path in pdf_dir.glob("*.pdf"):
            codes.add(normalize_pdf_code(path.name))
    return codes


def main() -> None:
    cruzblanca_dir = (
        Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else DEFAULT_FOLDER
    )
    output_path = (
        Path(sys.argv[2]).expanduser().resolve()
        if len(sys.argv) > 2
        else OUTPUT_PATH
    )

    rm_xlsx = find_file(cruzblanca_dir, ["Planes RM*.xlsx", "PLANES RM*.xlsx"])
    regiones_xlsx = find_file(cruzblanca_dir, ["PLANES REGIONES*.xlsx"])
    rm_pdf_dir = find_file(cruzblanca_dir, ["PDF PLANES RM*"])
    region_pdf_dir = find_file(cruzblanca_dir, ["PDF REGIONES*", "PDF PLANES REGION*"])

    if not rm_xlsx or not rm_pdf_dir:
        print("No se encontró Excel/PDF RM en cruz blanca.", file=sys.stderr)
        sys.exit(1)

    all_plans: dict[str, dict] = {}

    rm_plans = parse_simple_workbook(rm_xlsx, RM_ZONES)
    print(f"{rm_xlsx.name}: {len(rm_plans)} filas", file=sys.stderr)
    all_plans.update(rm_plans)

    if regiones_xlsx:
        region_plans = parse_simple_workbook(regiones_xlsx, REGION_ZONES)
        print(f"{regiones_xlsx.name}: {len(region_plans)} filas", file=sys.stderr)
        for code, plan in region_plans.items():
            if code in all_plans:
                print(f"Plan duplicado entre RM/Regiones omitido: {code}", file=sys.stderr)
                continue
            all_plans[code] = plan

    pdf_codes = collect_pdf_codes(
        rm_pdf_dir,
        region_pdf_dir if region_pdf_dir else Path(),
    )

    plans = [plan for code, plan in sorted(all_plans.items()) if code in pdf_codes]
    missing_pdf = sorted(code for code in all_plans if code not in pdf_codes)
    orphan_pdfs = sorted(code for code in pdf_codes if code not in all_plans)

    output_path.write_text(json.dumps(plans, ensure_ascii=False, indent=2), encoding="utf-8")

    with_cov = sum(1 for plan in plans if plan["coverage"])
    print(
        f"Planes parseados: {len(plans)} (con cobertura: {with_cov}) -> {output_path}",
        file=sys.stderr,
    )
    print(f"PDFs en storage: {len(pdf_codes)}", file=sys.stderr)
    if missing_pdf:
        print(
            f"Filas Excel sin PDF ({len(missing_pdf)}): {', '.join(missing_pdf[:8])}"
            + ("…" if len(missing_pdf) > 8 else ""),
            file=sys.stderr,
        )
    if orphan_pdfs:
        print(
            f"PDFs sin fila Excel ({len(orphan_pdfs)}): {', '.join(orphan_pdfs[:8])}"
            + ("…" if len(orphan_pdfs) > 8 else ""),
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
