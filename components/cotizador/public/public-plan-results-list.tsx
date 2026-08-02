"use client";

import { motion } from "framer-motion";
import { motionGpu, planCard } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
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

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 28 },
  },
};

export function PublicPlanResultsList({
  plans,
  beneficiarySummary,
  ufToClp,
  currency,
  onRequestPlan,
  highlightHospitalClinicIds = [],
  highlightAmbulatoryClinicIds = [],
}: PublicPlanResultsListProps) {
  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className={planCard.listStack}
    >
      {plans.map((plan) => (
        <motion.div
          key={plan.unique_code}
          variants={cardVariants}
          className={joinClasses(motionGpu)}
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
    </motion.div>
  );
}
