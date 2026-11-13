"use client";

import { useClientQuotationsQuery } from "@/hooks/query/use-client-quotations-query";
import type { ClientQuotationRecord } from "@/types/client-quotation";

export function acceptedPlanFields(quotations: readonly ClientQuotationRecord[] = []) {
  const latest = quotations.filter(row =>
    (row.status === "ACCEPTED" || row.status === "RECEIVED") &&
    row.acceptedAt && row.holderSelections?.length,
  ).sort((a, b) => Date.parse(b.acceptedAt!) - Date.parse(a.acceptedAt!))[0];

  return latest?.holderSelections?.map(holder => ({
    label: holder.name,
    value: `${holder.isapre} · ${holder.planCode}`,
  })) ?? [];
}

export function ClientAcceptedPlans({ clientId }: { clientId: string }) {
  const { data } = useClientQuotationsQuery(clientId);
  const fields = acceptedPlanFields(data);
  if (!fields.length) return null;

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h4 className="text-sm font-semibold">Planes aceptados por titular</h4>
      <dl className="mt-2 space-y-2 text-sm">
        {fields.map(({ label, value }, index) => (
          <div key={index}>
            <dt className="font-medium">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
