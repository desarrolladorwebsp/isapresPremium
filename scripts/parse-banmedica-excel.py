#!/usr/bin/env python3
"""Parsea archivos Excel de planes Banmédica (Santiago / Regiones) a JSON."""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from datetime import date, datetime
from pathlib import Path

import openpyxl

CLINIC_NAME_TO_ID = {
    "Centros Médicos Clínica Santa María": "cm-santa-maria",
    "Centros Médicos Dávila": "cm-red-davila",
    "Centros Médicos Red Dávila": "cm-red-davila",
    "Centros Médicos Red UC Christus": "red-uc-christus",
    "Clínica Alemana": "cl-alemana-santiago",
    "Clínica Atacama": "cl-atacama",
    "Clínica Atacama Achs Salud": "cl-atacama-achs",
    "Clínica Dávila": "cl-davila",
    "Clínica Dávila Vespucio": "cl-davila-vespucio",
    "Clínica Indisa": "cl-indisa-providencia-anexo",
    "Clínica Indisa Providencia": "cl-indisa-providencia-anexo",
    "Clínica Las Condes": "cl-las-condes",
    "Clínica Meds": "cl-meds",
    "Clínica Portada Achs Salud": "cl-portada-achs",
    "Clínica RedSalud Elqui": "cl-redsalud-elqui",
    "Clínica RedSalud Iquique": "cl-redsalud-iquique",
    "Clínica RedSalud Providencia": "cl-redsalud-providencia",
    "Clínica RedSalud Providencia (Ex Avansalud)": "cl-redsalud-providencia-avansalud",
    "Clínica RedSalud Santiago": "cl-redsalud-santiago",
    "Clínica RedSalud Santiago (Ex Bicentenario)": "cl-redsalud-santiago-bicentenario",
    "Clínica Regional La Portada": "cl-regional-la-portada",
    "Clínica San Carlos de Apoquindo": "cl-san-carlos",
    "Clínica San José": "cl-san-jose-arica",
    "Clínica San José InterClínica": "cl-san-jose-interclinica",
    "Clínica Santa María": "cl-santa-maria",
    "Clínica UC": "cl-uc",
    "Clínica Universidad de Los Andes": "cl-univ-andes",
    "Clínica Universidad de Los Andes}": "cl-univ-andes",
    "Clínica Vespucio": "cl-davila-vespucio",
    "Hospital Clínico UC": "hosp-clinico-uc",
    "Integramédica": "integramedica",
    "Vidaintegra": "vidaintegra",
}

SKIP_CLINIC_LABELS = {"hospitalario", "ambulatorio"}
PERCENT_LINE = re.compile(r"^(\d+)%$")

# Celdas con formato de fecha erróneo en el Excel de origen.
PRICE_OVERRIDES: dict[str, float] = {
    "BNSLU2411C1": 3.62,
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
    if clinic_name in CLINIC_NAME_TO_ID:
        return CLINIC_NAME_TO_ID[clinic_name]

    slug = slugify_clinic_id(clinic_name)
    CLINIC_NAME_TO_ID[clinic_name] = slug
    print(f"Clínica nueva (slug auto): {clinic_name!r} -> {slug}", file=sys.stderr)
    return slug


def parse_price(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return None
    if isinstance(value, date):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", ".")
    if not text:
        return None
    if "-" in text and ":" in text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def normalize_cell_text(value) -> str:
    if value is None:
        return ""
    return str(value).strip().strip("}")


def parse_banmedica_coverage(text: str, coverage_type: str) -> list[dict]:
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

        if clinic_name.strip().lower() in SKIP_CLINIC_LABELS:
            continue

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


def normalize_plan_code(value) -> str | None:
    text = normalize_cell_text(value).upper()
    if not text:
        return None
    match = re.match(r"^([A-Z0-9]+)", text)
    return match.group(1) if match else text


def parse_workbook(xlsx_path: Path, default_zones: list[str] | None = None) -> list[dict]:
    workbook = openpyxl.load_workbook(xlsx_path, data_only=True)
    worksheet = workbook.active
    plans: list[dict] = []

    for row in worksheet.iter_rows(min_row=2, values_only=True):
        code_raw, price_raw, hospitalario_raw, ambulatorio_raw = (row + (None,) * 4)[:4]
        if not code_raw:
            continue

        code = normalize_plan_code(code_raw)
        if not code:
            continue
        base_price_uf = PRICE_OVERRIDES.get(code)
        if base_price_uf is None:
            base_price_uf = parse_price(price_raw)
        if base_price_uf is None:
            print(
                f"Plan omitido por precio inválido: {code} ({price_raw!r})",
                file=sys.stderr,
            )
            continue
        coverage: list[dict] = []

        if hospitalario_raw:
            coverage.extend(parse_banmedica_coverage(hospitalario_raw, "hospitalaria"))
        if ambulatorio_raw:
            coverage.extend(parse_banmedica_coverage(ambulatorio_raw, "ambulatoria"))

        plans.append(
            {
                "isapre": "Banmédica",
                "plan_name": f"Banmédica {code}",
                "unique_code": code,
                "base_price_uf": base_price_uf,
                "has_top": False,
                "additional_notes": None,
                "pdf_url": None,
                "pdf_public_id": None,
                "zones": list(default_zones or []),
                "coverage": coverage,
            }
        )

    return plans


def main() -> None:
    if len(sys.argv) < 3:
        print(
            "Uso: parse-banmedica-excel.py <xlsx-1> [xlsx-2 ...] <salida-json>",
            file=sys.stderr,
        )
        sys.exit(1)

    *input_paths, output_path = sys.argv[1:]
    plans: list[dict] = []

    RM_ZONES = [
        "rm-metropolitana",
        "rm-norte",
        "rm-sur",
        "rm-oriente",
        "rm-poniente",
        "rm-centro",
    ]
    REGIONES_ZONES = ["norte", "octava"]

    for input_path in input_paths:
        xlsx_path = Path(input_path).expanduser().resolve()
        name_lower = xlsx_path.name.lower()
        if "region" in name_lower:
            default_zones = REGIONES_ZONES
        else:
            default_zones = RM_ZONES
        parsed = parse_workbook(xlsx_path, default_zones=default_zones)
        print(f"{xlsx_path.name}: {len(parsed)} planes", file=sys.stderr)
        plans.extend(parsed)

    output = Path(output_path).expanduser().resolve()
    output.write_text(json.dumps(plans, ensure_ascii=False, indent=2), encoding="utf-8")

    with_cov = sum(1 for plan in plans if plan["coverage"])
    print(
        f"Planes parseados: {len(plans)} (con cobertura: {with_cov}) -> {output}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
