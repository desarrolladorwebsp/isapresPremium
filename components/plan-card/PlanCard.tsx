"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useOptionalCompanyAgreementContext } from "@/components/cotizador/company-agreement";
import { splitCoverageByType } from "@/domain";
import { buildPlanFinalPriceQuote } from "@/domain";
import {
  buildPlanWhatsAppMessage,
  copyTextToClipboard,
} from "@/lib/executive/build-plan-whatsapp-message";
import { buildWhatsAppUrl } from "@/lib/partner-entity/theme";
import { planCard } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { BeneficiaryGroupSummary } from "@/domain";
import type { HealthPlan } from "@/domain";
import { PlanCardActions } from "./plan-card-actions";
import { PlanCardCoverage } from "./plan-card-coverage";
import { PlanCardHeader } from "./plan-card-header";
import { PlanDetailModal } from "@/components/executive/plan-detail-modal";

export interface PlanCardActiveClient {
  fullName: string;
  phone: string | null;
}

export interface PlanCardProps {
  plan: HealthPlan;
  beneficiarySummary: BeneficiaryGroupSummary;
  selected?: boolean;
  ufToClp?: number;
  className?: string;
  onSelectedChange?: (selected: boolean) => void;
  onSelect?: () => void;
  onDownloadPdf?: () => void;
  onAddInsurance?: () => void;
  /** Cliente activo del workspace ejecutivo (WhatsApp / copiar). */
  activeClient?: PlanCardActiveClient | null;
  onNotify?: (message: string, tone?: "success" | "error") => void;
  selectLabel?: string;
  selectVariant?: "primary" | "success";
  highlightHospitalClinicIds?: string[];
  highlightAmbulatoryClinicIds?: string[];
}

export function PlanCard({
  plan,
  beneficiarySummary,
  selected = false,
  ufToClp,
  className,
  onSelectedChange,
  onSelect,
  onDownloadPdf,
  onAddInsurance,
  activeClient = null,
  onNotify,
  selectLabel,
  selectVariant,
  highlightHospitalClinicIds = [],
  highlightAmbulatoryClinicIds = [],
}: PlanCardProps) {
  const [isSelected, setIsSelected] = useState(selected);
  const [isHovered, setIsHovered] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const validatedAgreement =
    useOptionalCompanyAgreementContext()?.validatedAgreement ?? null;

  useEffect(() => {
    setIsSelected(selected);
  }, [selected]);

  const { hospitalaria, ambulatoria } = useMemo(
    () => splitCoverageByType(plan.coverage),
    [plan.coverage],
  );

  const priceQuote = useMemo(
    () =>
      buildPlanFinalPriceQuote(
        plan.base_price_uf,
        beneficiarySummary,
        ufToClp,
        plan.ges_premium_uf,
      ),
    [plan.base_price_uf, plan.ges_premium_uf, beneficiarySummary, ufToClp],
  );

  const isAssignCta = selectVariant === "success";

  function handleAssign() {
    onSelect?.();
  }

  function handleToggleSelection() {
    const next = !isSelected;
    setIsSelected(next);
    onSelectedChange?.(next);
  }

  function handleSelect() {
    if (onSelect && !onSelectedChange) {
      onSelect();
      return;
    }

    const next = !isSelected;
    setIsSelected(next);
    onSelectedChange?.(next);
    onSelect?.();
  }

  function handleDownloadPdf() {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }

    // Cotizador ejecutivo: abrir modal de detalle (tabs + PDF).
    setDetailOpen(true);
  }

  async function handleWhatsApp() {
    const message = buildPlanWhatsAppMessage({
      plan,
      beneficiarySummary,
      ufToClp: ufToClp ?? priceQuote.ufToClp,
      highlightHospitalClinicIds,
      highlightAmbulatoryClinicIds,
      clientFullName: activeClient?.fullName,
      validatedAgreement,
    });

    const phone = activeClient?.phone?.trim() || null;
    if (phone) {
      window.open(buildWhatsAppUrl(phone, message), "_blank", "noopener,noreferrer");
      onNotify?.("Abriendo WhatsApp con el resumen del plan.");
      return;
    }

    const copied = await copyTextToClipboard(message);
    if (copied) {
      onNotify?.("Mensaje copiado");
      return;
    }

    onNotify?.(
      "No se pudo copiar el mensaje. Revisa permisos del portapapeles.",
      "error",
    );
  }

  return (
    <motion.article
      layout="position"
      initial={false}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{ willChange: isHovered ? "transform, box-shadow" : "auto" }}
      animate={{
        y: isHovered ? -planCard.elevation.hoverLiftPx : 0,
        borderColor:
          isSelected || isHovered
            ? planCard.elevation.borderHover
            : planCard.elevation.borderRest,
        boxShadow:
          isHovered || isSelected
            ? planCard.elevation.shadowHover
            : planCard.elevation.shadowRest,
      }}
      transition={planCard.elevation.spring}
      className={joinClasses(
        planCard.root,
        isSelected && "ring-2 ring-primary/20",
        className,
      )}
    >
      <PlanCardHeader plan={plan} priceQuote={priceQuote} />

      <PlanCardCoverage
        hospitalaria={hospitalaria}
        ambulatoria={ambulatoria}
        highlightHospitalClinicIds={highlightHospitalClinicIds}
        highlightAmbulatoryClinicIds={highlightAmbulatoryClinicIds}
      />

      <PlanCardActions
        selected={isSelected}
        onSelect={isAssignCta ? handleAssign : handleSelect}
        onToggleSelection={
          onSelectedChange ? handleToggleSelection : undefined
        }
        onDownloadPdf={handleDownloadPdf}
        onAddInsurance={onAddInsurance}
        onWhatsApp={onNotify ? handleWhatsApp : undefined}
        selectLabel={selectLabel}
        selectVariant={selectVariant}
        assignClientName={activeClient?.fullName ?? null}
      />

      <PlanDetailModal
        open={detailOpen}
        plan={plan}
        beneficiarySummary={beneficiarySummary}
        priceQuote={priceQuote}
        highlightHospitalClinicIds={highlightHospitalClinicIds}
        highlightAmbulatoryClinicIds={highlightAmbulatoryClinicIds}
        initialTab="coverages"
        onClose={() => setDetailOpen(false)}
      />
    </motion.article>
  );
}
