#!/usr/bin/env python3
"""Generate migrations/017_seed_products_sag.sql from the SAG Excel resumen.

Usage:
  python3 scripts/generate_products_sag_seed.py [path/to/plaguicidas.xlsx]

Default xlsx: repo-root "Plaguicidas Autorizados - resumen al 01-10-2025.xlsx"
Requires: openpyxl
"""

from __future__ import annotations

import sys
from datetime import date, datetime
from pathlib import Path

try:
    import openpyxl
except ImportError as exc:
    raise SystemExit("Install openpyxl: pip install openpyxl") from exc

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_XLSX = ROOT / "Plaguicidas Autorizados - resumen al 01-10-2025.xlsx"
OUT_SQL = ROOT / "migrations" / "017_seed_products_sag.sql"

EXPECTED_HEADERS = [
    "Nº SAG",
    "NOMBRE COMERCIAL",
    "APTITUD",
    "SUSTANCIAS ACTIVAS",
    "CONCENTRACIÓN",
    "FORMULACIÓN (CÓDIGO)",
    "TITULAR AUTORIZACIÓN",
    "PRIMERA AUTORIZACION",
    "VENCIMIENTO AUTORIZACIÓN",
]


def sql_str(value) -> str:
    text = str(value).strip()
    return "'" + text.replace("'", "''") + "'"


def sql_date(value) -> str:
    if isinstance(value, datetime):
        return f"'{value.date().isoformat()}'"
    if isinstance(value, date):
        return f"'{value.isoformat()}'"
    return f"'{str(value).strip()[:10]}'"


def main() -> None:
    xlsx_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    if not xlsx_path.exists():
        raise SystemExit(f"Excel not found: {xlsx_path}")

    workbook = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    worksheet = workbook["data"]
    rows = list(worksheet.iter_rows(values_only=True))
    workbook.close()

    header = [str(cell).strip() if cell is not None else "" for cell in rows[0]]
    if header != EXPECTED_HEADERS:
        raise SystemExit(f"Unexpected headers:\n{header}\n!=\n{EXPECTED_HEADERS}")

    data_rows = rows[1:]
    lines: list[str] = [
        "-- 017: Seed products_sag desde resumen Plaguicidas Autorizados.",
        "-- Regenerar con: python3 scripts/generate_products_sag_seed.py",
        "-- Idempotente: ON CONFLICT (numero_sag) DO UPDATE.",
        "",
        "BEGIN;",
        "",
    ]

    batch_size = 100
    for start in range(0, len(data_rows), batch_size):
        batch = data_rows[start : start + batch_size]
        lines.extend(
            [
                "INSERT INTO public.products_sag (",
                "  numero_sag,",
                "  nombre_comercial,",
                "  aptitud,",
                "  sustancias_activas,",
                "  concentracion,",
                "  formulacion,",
                "  titular_autorizacion,",
                "  primera_autorizacion,",
                "  vencimiento_autorizacion",
                ") VALUES",
            ]
        )
        value_lines = []
        for row in batch:
            numero_sag = str(row[0]).strip()
            value_lines.append(
                f"  ({sql_str(numero_sag)}, {sql_str(row[1])}, {sql_str(row[2])}, {sql_str(row[3])}, "
                f"{sql_str(row[4])}, {sql_str(row[5])}, {sql_str(row[6])}, "
                f"{sql_date(row[7])}, {sql_date(row[8])})"
            )
        lines.append(",\n".join(value_lines))
        lines.extend(
            [
                "ON CONFLICT (numero_sag) DO UPDATE SET",
                "  nombre_comercial = EXCLUDED.nombre_comercial,",
                "  aptitud = EXCLUDED.aptitud,",
                "  sustancias_activas = EXCLUDED.sustancias_activas,",
                "  concentracion = EXCLUDED.concentracion,",
                "  formulacion = EXCLUDED.formulacion,",
                "  titular_autorizacion = EXCLUDED.titular_autorizacion,",
                "  primera_autorizacion = EXCLUDED.primera_autorizacion,",
                "  vencimiento_autorizacion = EXCLUDED.vencimiento_autorizacion,",
                "  updated_at = now();",
                "",
            ]
        )

    lines.extend(["COMMIT;", ""])
    OUT_SQL.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_SQL} ({len(data_rows)} products)")


if __name__ == "__main__":
    main()
