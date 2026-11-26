import assert from "node:assert/strict";
import { consumeStaffClientLaunch, openStaffClient, returnToStaffClientOrigin } from "@/lib/staff/staff-client-navigation";
import { staffClientHref } from "@/lib/staff/staff-sections";

const initialUrl = new URL("http://localhost:3000/cotizador/ejecutivos?section=calendario");
const browser = {
  location: initialUrl,
  history: {
    state: null as unknown,
    pushes: 0,
    returns: 0,
    pushState(state: unknown, _title: string, url: URL) {
      this.pushes += 1;
      this.replaceState(state, _title, url);
    },
    replaceState(state: unknown, _title: string, url: URL) {
      this.state = state;
      browser.location = url;
    },
    back() {
      this.returns += 1;
      this.replaceState(null, "", initialUrl);
    },
  },
};
Object.defineProperty(globalThis, "window", { value: browser, configurable: true });

const fixtureHref = staffClientHref("test-client", { flow: "premium", gestion: "reminder" });
assert.equal(returnToStaffClientOrigin("test-client"), false);
openStaffClient(fixtureHref, "calendario");
assert.equal(browser.history.pushes, 1);
assert.equal(browser.location.searchParams.get("from"), "calendario");
assert.equal(browser.location.searchParams.get("gestion"), "reminder");

openStaffClient(fixtureHref, "calendario");
openStaffClient("https://example.com/cotizador/ejecutivos?section=clientes&clientId=test-client", "calendario");
assert.equal(browser.history.pushes, 1);

consumeStaffClientLaunch();
assert.equal(browser.history.pushes, 1);
assert.equal(browser.location.searchParams.get("from"), "calendario");
assert.equal(browser.location.searchParams.has("flow"), false);
assert.equal(browser.location.searchParams.has("gestion"), false);
assert.equal(returnToStaffClientOrigin("other-client"), false);
assert.equal(returnToStaffClientOrigin("test-client"), true);
assert.equal(browser.location.href, initialUrl.href);
assert.equal(browser.history.returns, 1);

console.log("OK historial de fichas: entrada propia, regreso al origen, enlace directo y acción de calendario.");
