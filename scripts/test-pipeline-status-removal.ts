import assert from "node:assert/strict";
import {
  CLIENT_PIPELINE_STATUS_OPTIONS,
  CLIENT_PIPELINE_STATUS_LABELS,
  normalizeClientPipelineStatus,
  premiumHandoffPipelineStatus,
} from "@/lib/client-pipeline/constants";

assert.ok(!CLIENT_PIPELINE_STATUS_OPTIONS.includes("CERRADO" as never));
assert.equal(normalizeClientPipelineStatus("cerrado"), null);
assert.equal(CLIENT_PIPELINE_STATUS_LABELS.ENVIADO_ISAPRE, "Enviado a Isapre");
assert.equal(premiumHandoffPipelineStatus("ISAPRES"), "RECEPCIONADO");
assert.equal(premiumHandoffPipelineStatus("ZOOM"), "NO_CONTESTA");

console.log("OK estados: Cerrado retirado, derivación Isapres a Recepcionado, Zoom a No contesta.");
