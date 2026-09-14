import assert from "node:assert/strict";
import { PRINCIPAL_TITULAR_ID } from "../lib/client-profile/constants";
import {
  buildProtocoloZoomData,
  buildProtocoloZoomHtml,
} from "../lib/executive/build-protocolo-zoom-data";
import type {
  ClientAdditionalTitularProfile,
  ClientDependentProfile,
  ClientExecutiveProfile,
} from "../types/client-profile";
import type { UserRecord } from "../types/user";

function extraTitular(
  patch: Partial<ClientAdditionalTitularProfile> &
    Pick<ClientAdditionalTitularProfile, "id" | "firstNames" | "lastNames">,
): ClientAdditionalTitularProfile {
  return {
    id: patch.id,
    firstNames: patch.firstNames,
    lastNames: patch.lastNames,
    rut: patch.rut ?? "",
    birthDate: patch.birthDate ?? "",
    age: patch.age ?? "",
    heightCm: patch.heightCm ?? "",
    weightKg: patch.weightKg ?? "",
    maritalStatus: patch.maritalStatus ?? "",
    phone: patch.phone ?? "",
    currentIsapre: patch.currentIsapre ?? "",
    currentPlanPrice: patch.currentPlanPrice ?? "",
    currentPlanPriceCurrency: patch.currentPlanPriceCurrency ?? "UF",
    voluntaryAdditional: patch.voluntaryAdditional ?? "",
    voluntaryAdditionalCurrency: patch.voluntaryAdditionalCurrency ?? "UF",
    rentaImponible: patch.rentaImponible ?? "",
    motivoCotizacion: patch.motivoCotizacion ?? "",
    motivoCotizacionOther: patch.motivoCotizacionOther ?? "",
    preexistenciasMedicas: patch.preexistenciasMedicas ?? "",
  };
}

function carga(
  patch: Partial<ClientDependentProfile> & Pick<ClientDependentProfile, "id">,
): ClientDependentProfile {
  return {
    id: patch.id,
    fullName: patch.fullName ?? "",
    rut: patch.rut ?? "",
    birthDate: patch.birthDate ?? "",
    age: patch.age ?? "",
    heightCm: patch.heightCm ?? "",
    weightKg: patch.weightKg ?? "",
    preexistenciasMedicas: patch.preexistenciasMedicas ?? "",
    titularId: patch.titularId,
  };
}

function clientWithProfile(
  fullName: string,
  profile: Partial<ClientExecutiveProfile>,
): UserRecord {
  return {
    id: "client-1",
    email: "cliente@test.cl",
    phone: "+56911111111",
    fullName,
    rut: "11111111-1",
    role: "CLIENT",
    active: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    clientProfile: {
      firstNames: profile.firstNames ?? fullName.split(" ")[0] ?? "",
      lastNames: profile.lastNames ?? fullName.split(" ").slice(1).join(" "),
      birthDate: profile.birthDate ?? "",
      age: profile.age ?? "40",
      currentIsapre: profile.currentIsapre ?? "",
      currentPlanPrice: profile.currentPlanPrice ?? "",
      currentPlanPriceCurrency: profile.currentPlanPriceCurrency ?? "UF",
      voluntaryAdditional: profile.voluntaryAdditional ?? "",
      voluntaryAdditionalCurrency: profile.voluntaryAdditionalCurrency ?? "UF",
      heightCm: profile.heightCm ?? "",
      weightKg: profile.weightKg ?? "",
      maritalStatus: profile.maritalStatus ?? "",
      employerRut: profile.employerRut ?? "",
      contributorType: profile.contributorType ?? "",
      rentaImponible: profile.rentaImponible ?? "",
      motivoCotizacion: profile.motivoCotizacion ?? "",
      motivoCotizacionOther: profile.motivoCotizacionOther ?? "",
      address: profile.address ?? "",
      commune: profile.commune ?? "",
      coverageArea: profile.coverageArea ?? "",
      coverageRegionId: profile.coverageRegionId ?? "",
      preferredClinics: profile.preferredClinics ?? "",
      anualidad: profile.anualidad === true,
      anualidadComment: profile.anualidadComment ?? "",
      segurosComplementarios: profile.segurosComplementarios ?? "",
      preexistenciasMedicas: profile.preexistenciasMedicas ?? "",
      dependents: profile.dependents ?? [],
      additionalTitulares: profile.additionalTitulares ?? [],
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  };
}

function assertUniqueNames(html: string, names: string[]) {
  for (const name of names) {
    const matches = html.split(name).length - 1;
    assert.ok(matches >= 1, `Falta ${name} en la ficha`);
  }
}

// 1 titular sin cargas
const solo = buildProtocoloZoomData(
  clientWithProfile("Jessica Lillo", {
    firstNames: "Jessica",
    lastNames: "Lillo",
    age: "38",
  }),
);
assert.equal(solo.titulares.length, 1);
assert.equal(solo.titulares[0]?.nombre, "Jessica Lillo");
assert.equal(solo.titulares[0]?.cargasEdades, "");
const soloHtml = buildProtocoloZoomHtml(solo);
assert.ok(soloHtml.includes("Jessica Lillo"));
assert.ok(!soloHtml.includes("DATOS TITULAR 2"));

// 1 titular con cargas
const conCargas = buildProtocoloZoomData(
  clientWithProfile("Jessica Lillo", {
    firstNames: "Jessica",
    lastNames: "Lillo",
    dependents: [
      carga({ id: "dep-1", age: "8", rut: "22222222-2" }),
      carga({ id: "dep-2", age: "12" }),
    ],
  }),
);
assert.equal(conCargas.titulares.length, 1);
assert.ok(conCargas.titulares[0]?.cargasEdades.includes("Carga 1: 8 años"));
assert.ok(conCargas.titulares[0]?.cargasEdades.includes("Carga 2: 12 años"));

// 2 titulares con cargas distintas (Jessica es titular 2)
const segundoId = "tit-jessica";
const dosTitulares = buildProtocoloZoomData(
  clientWithProfile("Carlos Soto", {
    firstNames: "Carlos",
    lastNames: "Soto",
    age: "42",
    additionalTitulares: [
      extraTitular({
        id: segundoId,
        firstNames: "Jessica",
        lastNames: "Lillo",
        age: "38",
        phone: "+56922222222",
        rut: "33333333-3",
      }),
    ],
    dependents: [
      carga({
        id: "carga-carlos",
        age: "10",
        titularId: PRINCIPAL_TITULAR_ID,
      }),
      carga({
        id: "carga-jessica",
        age: "6",
        titularId: segundoId,
      }),
    ],
  }),
);
assert.equal(dosTitulares.titulares.length, 2);
assert.equal(dosTitulares.titulares[0]?.nombre, "Carlos Soto");
assert.equal(dosTitulares.titulares[1]?.nombre, "Jessica Lillo");
assert.ok(dosTitulares.titulares[0]?.cargasEdades.includes("Carga 1: 10 años"));
assert.ok(!dosTitulares.titulares[0]?.cargasEdades.includes("6 años"));
assert.ok(dosTitulares.titulares[1]?.cargasEdades.includes("Carga 1: 6 años"));
assert.ok(!dosTitulares.titulares[1]?.cargasEdades.includes("10 años"));

const dosHtml = buildProtocoloZoomHtml(dosTitulares);
assertUniqueNames(dosHtml, ["Carlos Soto", "Jessica Lillo"]);
assert.ok(dosHtml.includes("DATOS TITULAR 2"));
assert.ok(dosHtml.includes("DATOS CLIENTE"));

// Cargas antiguas sin titularId quedan en el titular principal, no se duplican.
const legacy = buildProtocoloZoomData(
  clientWithProfile("Carlos Soto", {
    firstNames: "Carlos",
    lastNames: "Soto",
    additionalTitulares: [
      extraTitular({
        id: "tit-2",
        firstNames: "Jessica",
        lastNames: "Lillo",
      }),
    ],
    dependents: [carga({ id: "dep-legacy", age: "9" })],
  }),
);
assert.ok(legacy.titulares[0]?.cargasEdades.includes("9 años"));
assert.equal(legacy.titulares[1]?.cargasEdades, "");

console.log("OK protocolo zoom ficha titulares");
