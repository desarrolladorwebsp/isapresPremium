"use client";

import {
  buildClientWhatsAppUrl,
  buildProposalEmailUrl,
} from "@/lib/lead/quote-outreach";
import { Button } from "@/components/ui/button";
import { IconMail, IconWhatsApp } from "@/components/executive/executive-icons";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_OPTIONS,
} from "@/lib/quote-status";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { QuoteRecord, QuoteStatus } from "@/types/quote";

export interface QuoteLeadActionsProps {
  quote: QuoteRecord;
  executiveName?: string | null;
  canEditStatus?: boolean;
  saving?: boolean;
  onStatusChange?: (status: QuoteStatus) => void;
  compact?: boolean;
}

export function QuoteLeadActions({
  quote,
  executiveName,
  canEditStatus = false,
  saving = false,
  onStatusChange,
  compact = false,
}: QuoteLeadActionsProps) {
  const whatsAppUrl = buildClientWhatsAppUrl(quote, executiveName);
  const emailUrl = buildProposalEmailUrl(quote, executiveName);

  return (
    <div
      className={joinClasses(
        "flex flex-col gap-2",
        compact ? "" : "sm:flex-row sm:flex-wrap sm:items-center",
      )}
    >
      {canEditStatus && onStatusChange ? (
        <select
          value={quote.status}
          disabled={saving}
          onChange={(event) =>
            onStatusChange(event.target.value as QuoteStatus)
          }
          className={joinClasses(
            "h-9 min-w-[9.5rem] rounded-lg px-2 text-xs font-medium",
            ui.input,
          )}
          aria-label="Estado del lead"
        >
          {QUOTE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {QUOTE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      ) : null}

      {whatsAppUrl ? (
        <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="whatsapp" className={compact ? "w-full" : ""}>
            <IconWhatsApp className="mr-1.5 size-3.5" />
            WhatsApp
          </Button>
        </a>
      ) : null}

      <a href={emailUrl}>
        <Button size="sm" variant="info" className={compact ? "w-full" : ""}>
          <IconMail className="mr-1.5 size-3.5" />
          Enviar propuesta
        </Button>
      </a>
    </div>
  );
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const tone =
    status === "PENDING"
      ? "warning"
      : status === "CONTACTED"
        ? "info"
        : status === "CONVERTED"
          ? "success"
          : "neutral";

  return (
    <span
      className={joinClasses(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone === "warning" && "bg-amber-100 text-amber-900",
        tone === "info" && "bg-sky-100 text-sky-900",
        tone === "success" && "bg-emerald-100 text-emerald-900",
        tone === "neutral" && "bg-gray-100 text-gray-700",
      )}
    >
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}

export function QuoteLeadActionsHint() {
  return (
    <p className="text-xs text-muted">
      Usa WhatsApp o correo para enviar la propuesta. Actualiza el estado según
      avance el cliente.
    </p>
  );
}
