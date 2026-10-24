"use client";

import { motion, useReducedMotion } from "framer-motion";
import { planCard } from "@/lib/ui-tokens";
import type { BeneficiaryGroupSummary } from "@/domain";
import type { HealthPlanSummary } from "@/domain";
import { PublicPlanCard } from "./public-plan-card";
import type { CurrencyDisplay } from "./public-results-toolbar";

export interface PublicPlanResultsListProps {
  plans: HealthPlanSummary[];
  beneficiarySummary: BeneficiaryGroupSummary;
  ufToClp: number;
  currency: CurrencyDisplay;
  onRequestPlan: (plan: HealthPlanSummary) => void;
  highlightHospitalClinicIds?: string[];
  highlightAmbulatoryClinicIds?: string[];
}

export function PublicPlanResultsList({
  plans,
  beneficiarySummary,
  ufToClp,
  currency,
  onRequestPlan,
  highlightHospitalClinicIds = [],
  highlightAmbulatoryClinicIds = [],
}: PublicPlanResultsListProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={planCard.listStack}>
      {plans.map((plan) => (
        <motion.div
          key={plan.unique_code}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="min-w-0"
        >
          <PublicPlanCard
            plan={plan}
            beneficiarySummary={beneficiarySummary}
            ufToClp={ufToClp}
            currency={currency}
            highlightHospitalClinicIds={highlightHospitalClinicIds}
            highlightAmbulatoryClinicIds={highlightAmbulatoryClinicIds}
            onRequest={() => onRequestPlan(plan)}
          />
        </motion.div>
      ))}
    </div>
  );
}
