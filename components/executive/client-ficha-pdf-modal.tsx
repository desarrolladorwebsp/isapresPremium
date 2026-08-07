"use client";

import { useMemo, useRef } from "react";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import {
  buildProtocoloZoomData,
  buildProtocoloZoomHtml,
  openProtocoloZoomPrint,
  printProtocoloZoomIframe,
} from "@/lib/executive/build-protocolo-zoom-data";
import type { UserRecord } from "@/types/user";

export function ClientFichaPdfModal({
  client,
  open,
  onClose,
  onNotify,
}: {
  client: UserRecord;
  open: boolean;
  onClose: () => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => {
    if (!open) return "";
    return buildProtocoloZoomHtml(buildProtocoloZoomData(client));
  }, [client, open]);

  function handlePrint() {
    try {
      printProtocoloZoomIframe(iframeRef.current);
    } catch {
      try {
        openProtocoloZoomPrint(buildProtocoloZoomData(client));
      } catch (error) {
        onNotify(
          error instanceof Error
            ? error.message
            : "No se pudo abrir la ficha PDF.",
          "error",
        );
      }
    }
  }

  return (
    <AdminFormModal
      open={open}
      onClose={onClose}
      title="Ficha PDF — Protocolo Zoom Isapre"
      description="Vista previa con los datos del cliente. Usa Imprimir / Guardar PDF para exportar."
      size="xl"
      headerTone="navy"
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <iframe
            ref={iframeRef}
            title="Protocolo Zoom Isapre"
            srcDoc={html}
            className="h-[min(70vh,44rem)] w-full bg-white"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" variant="primary" onClick={handlePrint}>
            Imprimir / Guardar PDF
          </Button>
        </div>
      </div>
    </AdminFormModal>
  );
}
