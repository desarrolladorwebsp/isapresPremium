import assert from "node:assert/strict";
import { getStaffSectionsForAccount } from "../lib/auth/staff-role";
import { buildStaffNav } from "../lib/staff/staff-nav";
import { isStaffSection } from "../lib/staff/staff-sections";

assert.equal(isStaffSection("reportes"), true);

const adminSections = getStaffSectionsForAccount({ realm: "admin" });
assert.equal(adminSections.includes("reportes"), true, "ADMIN ve Reportes");

const premium = getStaffSectionsForAccount({
  realm: "executive",
  executiveKind: "ISAPRES_PREMIUM",
});
const zoom = getStaffSectionsForAccount({
  realm: "executive",
  executiveKind: "ZOOM",
});
const isapres = getStaffSectionsForAccount({
  realm: "executive",
  executiveKind: "ISAPRES",
});
const membership = getStaffSectionsForAccount({
  realm: "executive",
  executiveKind: "MEMBRESIA_ISAPRES_PREMIUM",
});

assert.equal(premium.includes("reportes"), false);
assert.equal(zoom.includes("reportes"), false);
assert.equal(isapres.includes("reportes"), false);
assert.equal(membership.includes("reportes"), false);

const adminNav = buildStaffNav(adminSections);
assert.equal(
  adminNav.some(
    (entry) =>
      (entry.kind === "item" && entry.id === "reportes") ||
      (entry.kind === "group" && entry.sections.includes("reportes")),
  ),
  true,
  "ADMIN tiene Reportes en el menú",
);

const zoomNav = buildStaffNav(zoom);
assert.equal(
  zoomNav.some(
    (entry) =>
      (entry.kind === "item" && entry.id === "reportes") ||
      (entry.kind === "group" && entry.sections.includes("reportes")),
  ),
  false,
  "Zoom no ve Reportes en el menú",
);

console.log("OK admin reportes access");
