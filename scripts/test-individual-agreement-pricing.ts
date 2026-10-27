import assert from "node:assert/strict";
import { buildBeneficiaryGroupSummary } from "@/lib/beneficiary-summary";
import { normalizeFamilyBeneficiaries, setPrimaryContributorAge } from "@/lib/beneficiary-state";
import { buildPlanFinalPriceQuote } from "@/lib/plan-final-price";
import { buildIndividualPlanAgreementPricing } from "@/lib/company-agreements/individual-plan-price";
import { buildPlanWhatsAppMessage, buildSelectedPlansEmailSnapshots, buildSelectedPlansTableTsv } from "@/lib/executive/build-plan-whatsapp-message";
import { buildCotizacionNotifyPayload } from "@/lib/cotizacion-notify/client";
import { createDefaultQuoteCriteria } from "@/lib/quote-criteria-options";
import { createDefaultDashboardFilters } from "@/lib/filter-options";
import { comparePlansByFinalPriceAsc } from "@/lib/plan-sort";
import { formatQuotedUf } from "@/lib/plan-format";
import type { FamilyBeneficiariesState } from "@/types/beneficiary";
import type { ValidatedCompanyAgreement } from "@/types/company-agreement";
import type { HealthPlan } from "@/types/plan";

const agreement: ValidatedCompanyAgreement = {
  companyRut: "760864285", companyRutRaw: "76.086.428-5", companyName: "Empresa de prueba",
  discountPercent: 20, isapreId: "colmena", isapreName: "Colmena",
};
const plan: HealthPlan = {
  isapre: "Colmena", unique_code: "PRUEBA-SIN-MAPPING", plan_name: "Plan de prueba",
  base_price_uf: 2, ges_premium_uf: 0.8, plan_type: "preferred", has_top: false,
  additional_notes: null, pdf_url: null, pdf_public_id: null, zones: [], coverage: [],
};
function group(first?: ValidatedCompanyAgreement | null, second?: ValidatedCompanyAgreement | null): FamilyBeneficiariesState {
  return { contributors: [{id: "a", age: 30, companyAgreement: first}, {id: "b", age: 30, companyAgreement: second}], dependents: [] };
}
function calculate(state: FamilyBeneficiariesState, selectedPlan = plan, legacy?: ValidatedCompanyAgreement | null) {
  const summary = buildBeneficiaryGroupSummary(state);
  const standard = buildPlanFinalPriceQuote(selectedPlan.base_price_uf, summary, 40000, selectedPlan.ges_premium_uf);
  return { standard, summary, ...buildIndividualPlanAgreementPricing(standard, selectedPlan.unique_code, selectedPlan.isapre, legacy) };
}
let passed = 0;
function test(label: string, check: () => void) { check(); passed++; console.log(`OK ${label}`); }
function close(actual: number, expected: number) { assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`); }

test("Caso requerido: primero con convenio, segundo sin convenio = 5,20 UF", () => {
  const result = calculate(group(agreement, null));
  assert.equal(result.quote.finalPriceUf, 5.2);
  assert.equal(result.quote.finalPriceClp, 208000);
  assert.equal(result.quote.gesTotalUf, 1.6);
  assert.equal(result.quote.beneficiaryPrices?.[0].finalPriceUf, 2.4);
  assert.equal(result.quote.beneficiaryPrices?.[1].finalPriceUf, 2.8);
  close(result.prices.discountPercent, 10);
});
test("Convenio solo en el segundo cotizante", () => {
  const result = calculate(group(null, agreement));
  assert.equal(result.quote.finalPriceUf, 5.2);
  assert.equal(result.quote.beneficiaryPrices?.[0].finalPriceUf, 2.8);
  assert.equal(result.quote.beneficiaryPrices?.[1].finalPriceUf, 2.4);
});
test("Cada cotizante puede tener un descuento distinto", () => {
  assert.equal(calculate(group(agreement, {...agreement, discountPercent:10})).quote.finalPriceUf, 5);
});
test("Dos convenios iguales = 4,80 UF; no aplicar dos veces el beneficio", () => {
  const result = calculate(group(agreement, agreement));
  assert.equal(result.quote.finalPriceUf, 4.8);
  const again = buildIndividualPlanAgreementPricing(result.quote,plan.unique_code,plan.isapre);
  assert.equal(again.quote.finalPriceUf, 4.8);
  assert.equal(again.prices.listFinalPriceUf, result.standard.finalPriceUf);
});
test("Sin convenio conserva exactamente el precio original", () => {
  const result = calculate(group(null, null));
  assert.equal(result.quote.finalPriceUf, result.standard.finalPriceUf);
  assert.equal(result.quote.finalPriceUf, 5.6);
  assert.equal(result.prices.hasAgreementDiscount, false);
});
test("Otra ISAPRE no recibe el descuento", () => {
  assert.equal(calculate(group(agreement, null), {...plan,isapre:"Banmédica"}).quote.finalPriceUf,5.6);
});
test("Beneficios de ISAPRE distintas: solo se aplica el que corresponde", () => {
  const result=calculate(group(agreement,{...agreement,isapreId:"banmedica",isapreName:"Banmédica",discountPercent:40}));
  assert.equal(result.quote.finalPriceUf,5.2);
});
test("Base especial de convenio solo en su cotizante, sin sumar otro 20%", () => {
  const result=calculate(group(agreement,null),{...plan,unique_code:"12038",base_price_uf:1.76});
  assert.equal(result.quote.finalPriceUf,4.92);
  assert.equal(result.quote.beneficiaryPrices?.[0].basePriceUf,1.56);
  assert.equal(result.quote.beneficiaryPrices?.[1].basePriceUf,1.76);
  assert.equal(result.quote.gesTotalUf,1.6);
});
test("Cargas sin descuento, incluso si su estado trae un convenio", () => {
  const state=group(agreement,null);
  state.dependents=[{id:"c",age:30,companyAgreement:agreement}];
  const result=calculate(state);
  assert.equal(result.quote.finalPriceUf,7.4);
  assert.equal(result.quote.beneficiaryPrices?.[2].basePriceUf,2);
  assert.equal(result.quote.beneficiaryPrices?.[2].discountPercent,0);
});
test("Factores diferentes: descontar exclusivamente el factor del titular", () => {
  const state=group(null,agreement);state.contributors[1].age=60;
  assert.equal(calculate(state).quote.finalPriceUf,6.8);
});
test("Quitar al titular no transfiere su convenio al otro cotizante", () => {
  const state=group(agreement,null);state.contributors=state.contributors.slice(1);
  assert.equal(calculate(state).quote.finalPriceUf,2.8);
});
test("Quitar un convenio deja de descontar solo a su titular", () => {
  assert.equal(calculate(group(null,{...agreement,discountPercent:10})).quote.finalPriceUf,5.4);
});
test("Compatibilidad: convenio global antiguo solo en primer cotizante", () => {
  assert.equal(calculate(group(),plan,agreement).quote.finalPriceUf,5.2);
  assert.equal(calculate(group(null,null),plan,agreement).quote.finalPriceUf,5.6);
});
test("Cambiar edad y normalizar conserva convenio por ID", () => {
  const state=normalizeFamilyBeneficiaries(setPrimaryContributorAge(group(agreement,null),40));
  assert.deepEqual(state.contributors[0].companyAgreement,agreement);
  const summary=buildBeneficiaryGroupSummary(state);
  assert.deepEqual(summary.contributors[0].companyAgreement,agreement);
});
test("Sin factores individuales no repartir un beneficio global a ciegas", () => {
  const standard=calculate(group()).standard;
  const legacyQuote={...standard,beneficiaryFactors:undefined};
  assert.equal(buildIndividualPlanAgreementPricing(legacyQuote,plan.unique_code,plan.isapre,agreement).quote.finalPriceUf,standard.finalPriceUf);
});
test("Límites: descuento inválido, cero y 100%; GES intacto", () => {
  for(const discountPercent of [0,-1,NaN,Infinity]) assert.equal(calculate(group({...agreement,discountPercent},null)).quote.finalPriceUf,5.6);
  const result=calculate(group({...agreement,discountPercent:100},null));
  assert.equal(result.quote.finalPriceUf,3.6);assert.equal(result.quote.gesTotalUf,1.6);
});
test("WhatsApp: valores individuales y total coinciden con el cálculo", () => {
  const {summary}=calculate(group(agreement,null));
  const message=buildPlanWhatsAppMessage({plan,beneficiarySummary:summary,ufToClp:40000});
  assert.ok(message.includes(`Cotizante 1 30 : ${formatQuotedUf(2.4)}`));
  assert.ok(message.includes(`Cotizante 2 30 : ${formatQuotedUf(2.8)}`));
  assert.ok(message.includes(formatQuotedUf(5.2)));
  assert.ok(message.includes("CONVENIO COTIZANTE 1"));
  assert.ok(!message.includes("CONVENIO COTIZANTE 2"));
});
test("Email de planes: total, precio de lista y titular del convenio", () => {
  const {summary}=calculate(group(null,agreement));
  const [snapshot]=buildSelectedPlansEmailSnapshots({plans:[plan],beneficiarySummary:summary,ufToClp:40000});
  assert.equal(snapshot.priceUf,formatQuotedUf(5.2));
  assert.equal(snapshot.listPriceUf,formatQuotedUf(5.6));
  assert.ok(snapshot.convenioLabel?.startsWith("Cotizante 2:"));
});
test("Tabla para Excel utiliza el total mixto", () => {
  const {summary}=calculate(group(agreement,null));
  const table=buildSelectedPlansTableTsv({plans:[plan],beneficiarySummary:summary,ufToClp:40000});
  assert.ok(table.includes(formatQuotedUf(5.2)));
});
test("Payload de aviso conserva lista y precio mixto sin descontar dos veces", () => {
  const result=calculate(group(null,agreement));
  const payload=buildCotizacionNotifyPayload({
    email:"prueba@example.invalid",criteria:createDefaultQuoteCriteria(),
    beneficiarySummary:result.summary,filters:createDefaultDashboardFilters(),
    sortKey:"price_asc",currency:"uf",priceQuote:result.quote,
    plan:{...plan,coverage_summary:{clinic_count:0,hospital_percentages:[],ambulatory_percentages:[],hospital_avg:0,ambulatory_avg:0}},
  });
  assert.equal(payload.plan?.precioListaUf,formatQuotedUf(5.6));
  assert.equal(payload.plan?.precioUf,formatQuotedUf(5.2));
});
test("Ordenación usa el mismo beneficio individual que la tarjeta", () => {
  const {summary}=calculate(group(agreement,null));
  const other={...plan,isapre:"Banmédica",unique_code:"OTRO",base_price_uf:1.85};
  // 5,20 UF (Colmena con beneficio individual) < 5,30 UF (otra ISAPRE).
  assert.ok(comparePlansByFinalPriceAsc(plan,other,summary,40000)<0);
});
test("No modificar objetos ni cotizaciones calculadas previamente", () => {
  const state=group(agreement,null);const {standard}=calculate(state);
  const saved=JSON.stringify(standard);const original=JSON.stringify(state);
  Object.freeze(standard);Object.freeze(state);
  buildIndividualPlanAgreementPricing(standard,plan.unique_code,plan.isapre);
  assert.equal(JSON.stringify(standard),saved);assert.equal(JSON.stringify(state),original);
});
console.log(JSON.stringify({resultado:"OK",pruebas:passed,casoMixtoUf:5.2,gesUf:1.6,cotizacionesAnteriores:"sin cambios"}));
