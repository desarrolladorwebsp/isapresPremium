"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ProspectHistoryTimeline } from "@/components/executive/admin/prospect-history-timeline";
import { QuoteStatusBadge } from "@/components/lead/quote-lead-actions";
import {
  QuoteContactCard,
  QuoteDatesCard,
  QuoteDetailGrid,
  QuotePlanCard,
} from "@/components/quote/quote-detail-blocks";
import {
  fetchQuoteActivities,
  updateQuoteLead,
} from "@/lib/api/admin-client";
import { ui, touchTarget } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_OPTIONS,
} from "@/lib/quote-status";
import type { QuoteActivityRecord } from "@/types/quote-activity";
import type { QuoteRecord, QuoteStatus } from "@/types/quote";
import type { StaffAccountRecord } from "@/types/staff-account";

export interface ProspectDetailDrawerProps {
  quote: QuoteRecord | null;
  executives: StaffAccountRecord[];
  lastActivityAt?: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (quote: QuoteRecord) => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
}

export function ProspectDetailDrawer({
  quote,
  executives,
  lastActivityAt,
  open,
  onClose,
  onUpdated,
  onNotify,
}: ProspectDetailDrawerProps) {
  const [activities, setActivities] = useState<QuoteActivityRecord[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !quote) {
      setActivities([]);
      return;
    }

    let cancelled = false;
    setLoadingActivities(true);

    void (async () => {
      try {
        const nextActivities = await fetchQuoteActivities(quote.id);
        if (!cancelled) {
          setActivities(nextActivities);
        }
      } catch (error) {
        if (!cancelled) {
          onNotify(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el historial.",
            "error",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingActivities(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, quote, onNotify]);

  async function handleUpdate(input: {
    executiveAccountId?: string | null;
    status?: QuoteStatus;
  }) {
    if (!quote) return;

    setSaving(true);
    try {
      const updated = await updateQuoteLead(quote.id, input);
      onUpdated(updated);
      const nextActivities = await fetchQuoteActivities(quote.id);
      setActivities(nextActivities);
      onNotify("Prospecto actualizado.");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo actualizar.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && quote ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-primary-dark/30 backdrop-blur-[2px]"
            aria-label="Cerrar detalle"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={joinClasses(
              "fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l bg-white shadow-2xl",
              ui.border,
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prospect-detail-title"
          >
            <header
              className={joinClasses(
                "flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 sm:px-6",
                ui.border,
              )}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Detalle del prospecto
                </p>
                <h2
                  id="prospect-detail-title"
                  className="mt-1 truncate text-xl font-bold text-primary-dark"
                >
                  {quote.fullName}
                </h2>
                <div className="mt-2">
                  <QuoteStatusBadge status={quote.status} />
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className={joinClasses(
                  "rounded-lg px-3 text-sm font-semibold text-muted",
                  touchTarget,
                  ui.hoverSurface,
                )}
              >
                Cerrar
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <QuoteContactCard quote={quote} />
                <QuotePlanCard quote={quote} />
              </div>

              <div
                className={joinClasses(
                  "mt-4 grid gap-4 rounded-xl border bg-bg-layout/40 p-4 sm:grid-cols-2",
                  ui.border,
                )}
              >
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Ejecutivo asignado
                  </span>
                  <select
                    value={quote.executiveAccountId ?? ""}
                    disabled={saving}
                    onChange={(event) => {
                      const value = event.target.value;
                      void handleUpdate({
                        executiveAccountId: value || null,
                      });
                    }}
                    className={joinClasses("h-11 w-full rounded-xl px-3 text-sm", ui.input)}
                  >
                    <option value="">Sin asignar</option>
                    {executives.map((executive) => (
                      <option key={executive.id} value={executive.id}>
                        {executive.fullName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Estado del pipeline
                  </span>
                  <select
                    value={quote.status}
                    disabled={saving}
                    onChange={(event) => {
                      void handleUpdate({
                        status: event.target.value as QuoteStatus,
                      });
                    }}
                    className={joinClasses("h-11 w-full rounded-xl px-3 text-sm", ui.input)}
                  >
                    {QUOTE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {QUOTE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4">
                <QuoteDatesCard
                  quote={quote}
                  lastActivityAt={lastActivityAt ?? activities[0]?.createdAt}
                />
              </div>

              <section className="mt-6">
                <h3 className="text-sm font-bold text-primary-dark">
                  Información completa
                </h3>
                <div className="mt-3">
                  <QuoteDetailGrid quote={quote} />
                </div>
              </section>

              <section className="mt-8">
                <h3 className="text-sm font-bold text-primary-dark">
                  Historial de gestiones
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Seguimiento de asignaciones, cambios de estado y acciones
                  realizadas por ejecutivos y administradores.
                </p>
                <div className="mt-4">
                  <ProspectHistoryTimeline
                    activities={activities}
                    loading={loadingActivities}
                  />
                </div>
              </section>
            </div>

            <footer
              className={joinClasses(
                "flex shrink-0 justify-end gap-2 border-t px-5 py-4 sm:px-6",
                ui.border,
              )}
            >
              <Button type="button" variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
