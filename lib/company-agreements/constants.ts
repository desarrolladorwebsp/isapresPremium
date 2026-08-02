/** Isapre asociada al convenio holding Colmena (filiales por holding). */
export const COLMENA_HOLDING_AGREEMENT_ISAPRE_ID = "colmena";

/** Isapre asociada a convenios empresa Consalud. */
export const CONSALUD_HOLDING_AGREEMENT_ISAPRE_ID = "consalud";

/** Descuento por convenio empresa según isapre (porcentaje referencial). */
export const COMPANY_AGREEMENT_DISCOUNT_BY_ISAPRE: Readonly<
  Record<string, number>
> = {
  [COLMENA_HOLDING_AGREEMENT_ISAPRE_ID]: 10,
  [CONSALUD_HOLDING_AGREEMENT_ISAPRE_ID]: 6,
};

export function resolveCompanyAgreementDiscountPercent(
  isapreId: string,
): number {
  return COMPANY_AGREEMENT_DISCOUNT_BY_ISAPRE[isapreId] ?? 10;
}

/**
 * Aviso legal cuando el cotizador muestra un descuento por convenio empresa.
 * El beneficio es referencial hasta que un ejecutivo lo confirme.
 */
export const COMPANY_AGREEMENT_DISCOUNT_DISCLAIMER =
  "El descuento indicado es referencial y queda sujeto a confirmación del ejecutivo comercial antes de su aplicación definitiva.";
