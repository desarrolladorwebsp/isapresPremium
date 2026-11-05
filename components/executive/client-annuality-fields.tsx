"use client";

import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { annualityAvailable, defaultAnnualityExpiry, formatAnnualityMonth } from "@/lib/client-profile/annuality";

interface AnnualityValue {
  anualidad: boolean;
  anualidadExpiresMonth: string;
  anualidadComment?: string;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const key = String(index + 1).padStart(2, "0");
  return { value: key, label: new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" }).format(new Date(`2000-${key}-01T12:00:00Z`)) };
});

export function ClientAnnualityFields({ value, onChange, disabled = false }: {
  value: AnnualityValue;
  onChange: (patch: Partial<AnnualityValue>) => void;
  disabled?: boolean;
}) {
  const [year = "", month = ""] = value.anualidadExpiresMonth.split("-");
  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={value.anualidad} disabled={disabled}
          onChange={(event) => onChange({
            anualidad: event.target.checked,
            anualidadExpiresMonth: event.target.checked ? value.anualidadExpiresMonth || defaultAnnualityExpiry() : "",
            anualidadComment: event.target.checked ? "" : value.anualidadComment ?? "",
          })} />
        Sin anualidad
      </label>
      {value.anualidad ? (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Mes de vencimiento</span>
              <Select required disabled={disabled} value={month} options={MONTH_OPTIONS}
                onChange={(event) => onChange({ anualidadExpiresMonth: `${year}-${event.target.value}` })} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Año de vencimiento</span>
              <Input required disabled={disabled} value={year} inputMode="numeric" pattern="[1-9][0-9]{3}" maxLength={4}
                onChange={(event) => onChange({ anualidadExpiresMonth: `${event.target.value.replace(/\D/g, "").slice(0,4)}-${month}` })} />
            </label>
          </div>
          <p className="text-xs text-muted">Se propone el mismo mes del próximo año. Puedes cambiarlo manualmente.</p>
          {value.anualidadExpiresMonth ? (
            <p className={`text-xs ${annualityAvailable(value.anualidadExpiresMonth) ? "font-semibold text-emerald-700" : "text-muted"}`}>
              {annualityAvailable(value.anualidadExpiresMonth) ? "Disponible para gestionar desde" : "Se podrá gestionar desde"} {formatAnnualityMonth(value.anualidadExpiresMonth)}.
              {" "}El recordatorio aparece en Inicio desde el primer día de ese mes. Desmarca Anualidad al terminar la gestión.
            </p>
          ) : null}
        </div>
      ) : value.anualidadComment !== undefined ? (
        <label className="block space-y-1.5 text-sm">
          <span>Comentario (sin anualidad)</span>
          <Input disabled={disabled} value={value.anualidadComment} placeholder="Agregar comentario…"
            onChange={(event) => onChange({ anualidadComment: event.target.value })} />
        </label>
      ) : null}
    </div>
  );
}
