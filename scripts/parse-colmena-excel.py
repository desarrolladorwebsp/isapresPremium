#!/usr/bin/env python3
"""Parsea Excel de Colmena (Santiago / Regiones) y genera JSON alineado con PDFs locales."""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from datetime import date, datetime
from pathlib import Path

import openpyxl

ISAPRE_NAME = "Colmena"
DEFAULT_FOLDER = Path(__file__).resolve().parent.parent / "storage" / "planes-pdf" / "colmena"
OUTPUT_PATH = Path(__file__).resolve().parent / ".colmena-plans-parsed.json"

SANTIAGO_PREFIX_TO_FAMILY = {
    "BU": "COLMENA BLUE",
    "DU": "COLMENA DELUXE ULTRA",
    "EL": "COLMENA ELITE",
    "LP": "COLMENA PRO LT",
    "MS": "COLMENA MASTER",
    "PL": "COLMENA PLUS",
    "PR": "COLMENA PRO",
    "SL": "COLMENA SILVER",
    "ST": "COLMENA STAR",
}
SANTIAGO_FAMILY_TO_PREFIX = {value: key for key, value in SANTIAGO_PREFIX_TO_FAMILY.items()}

REGION_PREFIX_TO_FAMILY = {
    "NP": "COLMENA MAX NORTE PF",
    "SP": "COLMENA MAX SUR PF",
    "CP": "COLMENA MAX CENTRO PF",
    "CS": "MAX CENTROSUR",
    "QP": "MAX QUINTA PF",
    "MX": "COLMENA MAX",
}
REGION_FAMILY_TO_PREFIX = {value: key for key, value in REGION_PREFIX_TO_FAMILY.items()}

RM_ZONES = [
    "rm-metropolitana",
    "rm-norte",
    "rm-sur",
    "rm-oriente",
    "rm-poniente",
    "rm-centro",
]
REGION_ZONES = ["norte", "octava"]

SKIP_CLINIC_LABELS = {"hospitalario", "ambulatorio", "libre eleccion", "libre elección"}
PERCENT_LINE = re.compile(r"^(\d+)%$")
LIBRE_ELECCION_PATTERN = re.compile(r"libre\s*elecci[oó]n", re.IGNORECASE)

CLINIC_NAME_TO_ID: dict[str, str] = {
    "Centros Médicos Clínica Santa María": "cm-santa-maria",
    "Centros Médicos Red Dávila": "cm-red-davila",
    "Centros Médicos Red UC Christus": "red-uc-christus",
    "Centros Médicos RedSalud": "cm-redsalud",
    "Clínica Adventista Los Ángeles": "cl-adventista-los-angeles",
    "Clínica Alemana": "cl-alemana-santiago",
    "Clínica Alemana de Osorno": "cl-alemana-osorno",
    "Clínica Alemana de Temuco": "cl-alemana-temuco",
    "Clínica Alemana de Valdivia": "cl-alemana-valdivia",
    "Clínica Andes Salud Chillán": "cl-andes-salud-chillan",
    "Clínica Andes Salud Concepción": "cl-andes-salud-concepcion",
    "Clínica Andes Salud El Loa": "cl-andes-salud-el-loa",
    "Clínica Andes Salud Puerto Montt": "cl-andes-salud-puerto-montt",
    "Clínica Atacama Achs Salud": "cl-atacama-achs",
    "Clínica Biobío": "cl-biobio",
    "Clínica Bupa Antofagasta": "cl-bupa-antofagasta",
    "Clínica Bupa Reñaca": "cl-bupa-renaca",
    "Clínica Bupa Santiago": "cl-bupa-santiago",
    "Clínica Ciudad del Mar": "cl-ciudad-del-mar",
    "Clínica Cordillera": "cl-cordillera",
    "Clínica Cumbres del Norte": "cl-cumbres-del-norte",
    "Clínica Dávila": "cl-davila",
    "Clínica Dávila Vespucio": "cl-davila-vespucio",
    "Clínica del Sur Achs Salud": "hosp-clinico-del-sur",
    "Clínica Fleming Arica": "cl-fleming-arica",
    "Clínica Hospital del Profesor": "cl-hospital-del-profesor",
    "Clínica Indisa": "cl-indisa-providencia-anexo",
    "Clínica Indisa Maipú": "cl-indisa-maipu",
    "Clínica Isamédica": "integramedica",
    "Clínica Juan Pablo II": "cl-juan-pablo-ii",
    "Clínica Las Amapolas": "cl-las-amapolas",
    "Clínica Las Condes": "cl-las-condes",
    "Clínica Lircay Achs Salud": "cl-andes-salud-talca",
    "Clínica Los Andes Los Ángeles": "cl-los-andes-la",
    "Clínica Los Carrera InterClínica": "cl-los-carrera",
    "Clínica Meds": "cl-meds",
    "Clínica Portada Achs Salud": "cl-portada-achs",
    "Clínica Puerto Montt Achs Salud": "cl-puerto-montt",
    "Clínica Puerto Varas": "cl-puerto-varas",
    "Clínica RedSalud Elqui": "cl-redsalud-elqui",
    "Clínica RedSalud Iquique": "cl-redsalud-iquique",
    "Clínica RedSalud Magallanes": "cl-redsalud-magallanes",
    "Clínica RedSalud Mayor Temuco": "cl-redsalud-mayor",
    "Clínica RedSalud Providencia": "cl-redsalud-providencia",
    "Clínica RedSalud Rancagua": "cl-redsalud-rancagua",
    "Clínica RedSalud Santiago": "cl-redsalud-santiago",
    "Clínica RedSalud Valparaíso": "cl-redsalud-valparaiso",
    "Clínica RedSalud Vitacura": "cl-redsalud-vitacura",
    "Clínica Río Blanco": "cl-rio-blanco",
    "Clínica San Antonio": "cl-san-antonio",
    "Clínica San Carlos de Apoquindo": "cl-san-carlos",
    "Clínica San José InterClínica": "cl-san-jose-interclinica",
    "Clínica Sanatorio Alemán": "sanatorio-aleman",
    "Clínica Santa María": "cl-santa-maria",
    "Clínica Sierra Bella": "cl-sierra-bella",
    "Clínica Tarapacá InterClínica": "cl-tarapaca-interclinica",
    "Clínica UC": "hosp-clinico-uc",
    "Clínica Universidad de Los Andes": "cl-univ-andes",
    "Fundación Arturo López Pérez": "falp",
    "Hospital Clínico de La Fach": "hosp-clinico-fach",
    "Hospital Clínico Fusat": "hosp-clinico-fusat",
    "Hospital Clínico UC": "hosp-clinico-uc",
    "Hospital Clínico Universidad de Chile": "hosp-clinico-uch",
    "Hospital Clínico Viña del Mar": "hosp-vina-del-mar",
    "Hospital de Las FFAA Cirujano Guzmán": "hosp-ffaa-guzman",
    "Hospital Militar de Santiago": "hosp-militar-santiago",
    "Hospital Militar del Norte": "hosp-militar-norte",
    "Hospital Naval Almirante Nef": "hosp-naval-nef",
    "Hospital Parroquial de San Bernardo": "hosp-parroquial-san-bernardo",
    "Integramédica": "integramedica",
    "Libre Elección": "libre-eleccion",
    "Vidaintegra": "vidaintegra",
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


def resolve_clinic_id(clinic_name: str, coverage_type: str) -> str | None:
    if LIBRE_ELECCION_PATTERN.search(clinic_name):
        return f"col-libre-eleccion-{coverage_type[:1]}"
    if clinic_name.strip().lower() in SKIP_CLINIC_LABELS:
        return None

    if clinic_name in CLINIC_NAME_TO_ID:
        return CLINIC_NAME_TO_ID[clinic_name]

    slug = slugify_clinic_id(clinic_name)
    CLINIC_NAME_TO_ID[clinic_name] = slug
    print(f"Clínica nueva (slug auto): {clinic_name!r} -> {slug}", file=sys.stderr)
    return slug


def parse_price(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", ".")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def normalize_cell_text(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def title_plan_name(family: str, suffix: str) -> str:
    words = family.split()
    titled = " ".join(word.capitalize() for word in words)
    return f"{titled} {suffix}"


def parse_coverage(text: str, coverage_type: str) -> list[dict]:
    if not text:
        return []

    lines = [normalize_cell_text(line) for line in str(text).split("\n")]
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

        clinic_id = resolve_clinic_id(clinic_name, coverage_type)
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


def parse_workbook_row(row) -> dict | None:
    code_raw, price_raw, hospitalario_raw, ambulatorio_raw = (row + (None,) * 4)[:4]
    if not code_raw:
        return None

    raw = normalize_cell_text(code_raw).upper()
    family, suffix, prefix = parse_plan_identity(raw)
    if not prefix:
        print(f"Plan omitido (sin prefijo): {raw}", file=sys.stderr)
        return None

    base_price_uf = parse_price(price_raw)
    if base_price_uf is None:
        print(f"Plan omitido por precio inválido: {raw} ({price_raw!r})", file=sys.stderr)
        return None

    coverage: list[dict] = []
    if hospitalario_raw:
        coverage.extend(parse_coverage(hospitalario_raw, "hospitalaria"))
    if ambulatorio_raw:
        coverage.extend(parse_coverage(ambulatorio_raw, "ambulatoria"))

    unique_code = f"{prefix}{suffix}"
    zones = RM_ZONES if prefix in SANTIAGO_PREFIX_TO_FAMILY else REGION_ZONES

    return {
        "isapre": ISAPRE_NAME,
        "plan_name": title_plan_name(family, suffix),
        "unique_code": unique_code,
        "base_price_uf": base_price_uf,
        "has_top": False,
        "additional_notes": None,
        "pdf_url": None,
        "pdf_public_id": None,
        "zones": list(zones),
        "coverage": coverage,
    }


def parse_plan_identity(raw: str) -> tuple[str, str, str | None]:
    """Devuelve (familia, sufijo, prefijo PDF)."""
    match = re.match(r"^(MAX CENTROSUR)\s+(PF[\dA-Z]+)$", raw)
    if match:
        suffix = match.group(2)[2:]
        return match.group(1), suffix, "CS"

    match = re.match(r"^(COLMENA MAX)\s+([\dA-Z]+)$", raw)
    if match:
        return match.group(1), match.group(2), "MX"

    parts = raw.split()
    suffix = parts[-1]
    family = " ".join(parts[:-1])

    if family in SANTIAGO_FAMILY_TO_PREFIX:
        return family, suffix, SANTIAGO_FAMILY_TO_PREFIX[family]

    if family in REGION_FAMILY_TO_PREFIX:
        return family, suffix, REGION_FAMILY_TO_PREFIX[family]

    return family, suffix, None


def parse_workbook(xlsx_path: Path) -> dict[str, dict]:
    workbook = openpyxl.load_workbook(xlsx_path, data_only=True)
    worksheet = workbook.active
    rows: dict[str, dict] = {}

    for row in worksheet.iter_rows(min_row=2, values_only=True):
        plan = parse_workbook_row(row)
        if plan:
            rows[plan["unique_code"]] = plan

    return rows


def find_file(colmena_dir: Path, patterns: list[str]) -> Path | None:
    for pattern in patterns:
        matches = sorted(colmena_dir.glob(pattern))
        if matches:
            return matches[-1]
    return None


def collect_pdf_codes(*pdf_dirs: Path) -> set[str]:
    codes: set[str] = set()
    for pdf_dir in pdf_dirs:
        if not pdf_dir.is_dir():
            continue
        for path in pdf_dir.glob("*.pdf"):
            codes.add(path.stem.upper())
    return codes


def main() -> None:
    colmena_dir = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else DEFAULT_FOLDER
    output_path = (
        Path(sys.argv[2]).expanduser().resolve()
        if len(sys.argv) > 2
        else OUTPUT_PATH
    )

    santiago_xlsx = find_file(
        colmena_dir,
        ["BASE DE DATOS COLMENA SANTIAGO*.xlsx", "BASE DE DATOS COLMENA SANTIAGO.xlsx"],
    )
    regiones_xlsx = find_file(
        colmena_dir,
        ["BASE DE DATOS COLMENA REGIONES*.xlsx", "BASE DE DATOS COLMENA REGIONES.xlsx"],
    )
    santiago_pdf_dir = find_file(
        colmena_dir,
        ["PDF COLMENA SANTIAGO*", "PDF COLMENA SANTIAGO"],
    )
    regiones_pdf_dir = find_file(
        colmena_dir,
        ["PDF COLMENA REGIONES*", "PDF COLMENA REGIONES"],
    )

    if not santiago_xlsx or not santiago_pdf_dir:
        print("No se encontró Excel/PDF de Santiago en colmena.", file=sys.stderr)
        sys.exit(1)

    all_rows: dict[str, dict] = {}
    if santiago_xlsx:
        parsed = parse_workbook(santiago_xlsx)
        print(f"{santiago_xlsx.name}: {len(parsed)} filas", file=sys.stderr)
        all_rows.update(parsed)

    if regiones_xlsx:
        parsed = parse_workbook(regiones_xlsx)
        print(f"{regiones_xlsx.name}: {len(parsed)} filas", file=sys.stderr)
        all_rows.update(parsed)

    pdf_codes = collect_pdf_codes(
        santiago_pdf_dir,
        regiones_pdf_dir if regiones_pdf_dir else Path(),
    )

    plans = [plan for code, plan in sorted(all_rows.items()) if code in pdf_codes]
    missing_pdf = sorted(code for code in all_rows if code not in pdf_codes)
    orphan_pdfs = sorted(code for code in pdf_codes if code not in all_rows)

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
