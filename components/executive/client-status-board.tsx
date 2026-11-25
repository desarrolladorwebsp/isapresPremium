"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClientPortfolioCardProps } from "@/components/executive/client-portfolio-card";
import { normalizeClientPipelineStatus } from "@/lib/client-pipeline/constants";
import {
  CLIENT_BOARD_COLUMN_LABELS,
  CLIENT_BOARD_WORK_COLUMNS,
  clientBoardCardNote,
  clientBoardColumn,
  type ClientBoardColumn,
  type ClientBoardFilter,
  type ClientBoardQuotation,
} from "@/lib/executive/client-board";
import { joinClasses } from "@/lib/utils";
import type { UserRecord } from "@/types/user";

const COLUMN_PAGE_SIZE = 12;
const DRAG_THRESHOLD = 6;
const SCROLL_EDGE = 36;

const COLUMN_HEADER_TONES: Record<ClientBoardColumn, string> = {
  POR_CONTACTAR: "bg-amber-200 text-amber-950",
  EN_GESTION: "bg-sky-200 text-sky-950",
  COTIZACION_ENVIADA: "bg-indigo-200 text-indigo-950",
  PAUSADO: "bg-slate-200 text-slate-900",
  ENVIADO_ISAPRE: "bg-violet-200 text-violet-950",
  RECEPCIONADO: "bg-emerald-200 text-emerald-950",
  PERDIDO: "bg-rose-200 text-rose-950",
};

function readColumnOrder(viewerId?: string): ClientBoardColumn[] {
  const columns = CLIENT_BOARD_WORK_COLUMNS;

  try {
    if (viewerId && typeof window !== "undefined") {
      const saved: unknown = JSON.parse(window.localStorage.getItem(boardOrderKey(viewerId)) ?? "null");
      if (Array.isArray(saved)) {
        const valid = saved.filter((value: unknown): value is ClientBoardColumn =>
          columns.some((column) => column === value),
        );
        return [...new Set([...valid, ...columns])];
      }
      const previous: unknown = JSON.parse(window.localStorage.getItem(`executive-client-board-order:${viewerId}`) ?? "null");
      if (Array.isArray(previous)) {
        const mapped = previous.flatMap((value: unknown) => {
          const status = typeof value === "string" ? normalizeClientPipelineStatus(value) : null;
          if (!status) return [];
          const column = clientBoardColumn(status);
          if (column === "ENVIADO_ISAPRE") return ["COTIZACION_ENVIADA", column] as const;
          return columns.some((item) => item === column) ? [column] : [];
        });
        return [...new Set([...mapped, ...columns])];
      }
    }
  } catch {
    // Use the default order when storage is unavailable or invalid.
  }
  return [...columns];
}

function boardOrderKey(viewerId: string) {
  return `executive-client-board-stage-order:${viewerId}`;
}

interface ColumnDrag {
  pointerId: number;
  source: ClientBoardColumn;
  startX: number;
  x: number;
  y: number;
  active: boolean;
}

function columnAtPoint(board: HTMLDivElement, x: number, y: number): ClientBoardColumn | null {
  const column = board.ownerDocument.elementFromPoint(x, y)?.closest<HTMLElement>("[data-client-board-column]");
  return column?.parentElement === board
    ? (column.dataset.clientBoardColumn as ClientBoardColumn)
    : null;
}

interface ClientStatusBoardProps {
  clients: readonly UserRecord[];
  filter: ClientBoardFilter;
  quotations: ReadonlyMap<string, ClientBoardQuotation>;
  viewerId?: string;
  filterKey: string;
  renderCard: (client: UserRecord, disclosure: NonNullable<ClientPortfolioCardProps["disclosure"]>) => ReactNode;
}

function ClientStatusColumn({
  status,
  clients,
  renderCard,
  quotations,
  reorderHandle,
  dragging,
  dropEdge,
}: {
  status: ClientBoardColumn;
  clients: readonly UserRecord[];
  renderCard: ClientStatusBoardProps["renderCard"];
  quotations: ClientStatusBoardProps["quotations"];
  reorderHandle: ReactNode;
  dragging: boolean;
  dropEdge: "left" | "right" | null;
}) {
  const [visibleCount, setVisibleCount] = useState(COLUMN_PAGE_SIZE);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());

  function toggleCard(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const label = CLIENT_BOARD_COLUMN_LABELS[status];

  return (
    <section
      aria-label={label}
      data-client-board-column={status}
      className={joinClasses(
        "relative flex max-h-[min(40rem,65dvh)] w-[min(18rem,88%)] shrink-0 flex-col rounded-xl border border-border/80 bg-white/60",
        dragging && "opacity-55",
      )}
    >
      {dropEdge ? (
        <span
          aria-hidden="true"
          className={joinClasses(
            "pointer-events-none absolute inset-y-0 z-10 w-1 rounded-full bg-primary",
            dropEdge === "left" ? "left-0" : "right-0",
          )}
        />
      ) : null}
      <header className={joinClasses(
        "flex shrink-0 items-center gap-2 rounded-t-[11px] border-b border-black/5 px-2 py-1.5",
        COLUMN_HEADER_TONES[status],
      )}>
        {reorderHandle}
        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-tight">{label}</h3>
        <span className="rounded-full bg-white/65 px-2 py-1 text-xs font-semibold tabular-nums">
          {clients.length}
        </span>
      </header>
      {clients.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted">Sin clientes</p>
      ) : (
        <div className="min-h-0 overflow-y-auto p-3">
          <ul className="space-y-2">
            {clients.slice(0, visibleCount).map((client) => (
              <li key={client.id}>
                {renderCard(client, {
                  expanded: expandedIds.has(client.id),
                  note: clientBoardCardNote(client.pipelineStatus, status, quotations.get(client.id)),
                  onToggle: () => toggleCard(client.id),
                })}
              </li>
            ))}
          </ul>
          {visibleCount < clients.length ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full"
              aria-label={`Mostrar más clientes en ${label}`}
              onClick={() => setVisibleCount((current) => current + COLUMN_PAGE_SIZE)}
            >
              Mostrar más
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function ClientStatusBoard({ clients, filter, quotations, viewerId, filterKey, renderCard }: ClientStatusBoardProps) {
  const [columnOrder, setColumnOrder] = useState(() => readColumnOrder(viewerId));
  const [dragSource, setDragSource] = useState<ClientBoardColumn | null>(null);
  const [dropTarget, setDropTarget] = useState<ClientBoardColumn | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const dragRef = useRef<ColumnDrag | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const reorderHelpId = useId();

  const visibleOrder = filter === "EN_CURSO" ? columnOrder : [filter];
  const clientsByColumn = new Map<ClientBoardColumn, UserRecord[]>();
  for (const column of visibleOrder) clientsByColumn.set(column, []);
  for (const client of clients) {
    const column = clientBoardColumn(client.pipelineStatus, quotations.get(client.id));
    clientsByColumn.get(column)?.push(client);
  }

  function moveColumn(source: ClientBoardColumn, target: ClientBoardColumn) {
    const from = visibleOrder.indexOf(source);
    const to = visibleOrder.indexOf(target);
    if (filter !== "EN_CURSO" || from < 0 || to < 0 || from === to) return;

    const reordered = [...visibleOrder];
    reordered.splice(from, 1);
    reordered.splice(to, 0, source);
    setColumnOrder(reordered);
    setAnnouncement(`${CLIENT_BOARD_COLUMN_LABELS[source]} movida a la posición ${to + 1} de ${visibleOrder.length}.`);
    try {
      if (viewerId) window.localStorage.setItem(boardOrderKey(viewerId), JSON.stringify(reordered));
    } catch {
      // The board still updates when browser storage is disabled.
    }
  }

  function clearDrag() {
    dragRef.current = null;
    setDragSource(null);
    setDropTarget(null);
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, source: ClientBoardColumn) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      source,
      startX: event.clientX,
      x: event.clientX,
      y: event.clientY,
      active: false,
    };
  }

  function updateDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.active) {
      if (Math.abs(drag.x - drag.startX) < DRAG_THRESHOLD) return;
      drag.active = true;
      setDragSource(drag.source);
    }
    setDropTarget(columnAtPoint(event.currentTarget, drag.x, drag.y));
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    const target = drag.active ? columnAtPoint(event.currentTarget, event.clientX, event.clientY) : null;
    clearDrag();
    if (target) moveColumn(drag.source, target);
  }

  function cancelDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) clearDrag();
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, status: ClientBoardColumn) {
    if (event.key === "Escape" && dragRef.current) {
      clearDrag();
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const target = visibleOrder[visibleOrder.indexOf(status) + (event.key === "ArrowLeft" ? -1 : 1)];
    if (!target) return;

    moveColumn(status, target);
    const handle = event.currentTarget;
    requestAnimationFrame(() => {
      if (!handle.isConnected) return;
      handle.focus({ preventScroll: true });
      handle.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }

  useEffect(() => {
    if (!dragSource) return;
    let frame: number;
    function scrollWhileDragging() {
      const board = boardRef.current;
      const drag = dragRef.current;
      if (!board || !drag?.active) return;

      const { left, right, top, bottom } = board.getBoundingClientRect();
      if (drag.y >= top && drag.y < bottom && drag.x >= left && drag.x < right) {
        const previousScroll = board.scrollLeft;
        if (drag.x < left + SCROLL_EDGE) board.scrollLeft -= 12;
        else if (drag.x > right - SCROLL_EDGE) board.scrollLeft += 12;
        if (board.scrollLeft !== previousScroll) setDropTarget(columnAtPoint(board, drag.x, drag.y));
      }
      frame = requestAnimationFrame(scrollWhileDragging);
    }
    frame = requestAnimationFrame(scrollWhileDragging);
    return () => cancelAnimationFrame(frame);
  }, [dragSource]);

  const sourceIndex = dragSource ? visibleOrder.indexOf(dragSource) : -1;
  const targetIndex = dropTarget ? visibleOrder.indexOf(dropTarget) : -1;

  return (
    <>
      <span id={reorderHelpId} className="sr-only">
        Arrastra el control o usa las flechas izquierda y derecha para cambiar el orden de la columna.
      </span>
      <span role="status" className="sr-only">{announcement}</span>
      <div
        ref={boardRef}
        role="region"
        aria-label="Tablero de clientes por estado"
        tabIndex={0}
        onPointerMove={updateDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
        className={joinClasses("flex max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-3", dragSource && "cursor-grabbing select-none")}
      >
        {visibleOrder.map((status, index) => (
          <ClientStatusColumn
            key={`${status}:${filterKey}`}
            status={status}
            clients={clientsByColumn.get(status) ?? []}
            quotations={quotations}
            renderCard={renderCard}
            dragging={index === sourceIndex}
            dropEdge={sourceIndex >= 0 && index === targetIndex && targetIndex !== sourceIndex
              ? targetIndex > sourceIndex ? "right" : "left"
              : null}
            reorderHandle={visibleOrder.length > 1 ? (
              <button
                type="button"
                aria-label={`Mover columna ${CLIENT_BOARD_COLUMN_LABELS[status]}`}
                aria-describedby={reorderHelpId}
                title="Arrastra para mover la columna"
                onPointerDown={(event) => startDrag(event, status)}
                onKeyDown={(event) => moveWithKeyboard(event, status)}
                className="inline-flex size-10 shrink-0 touch-none cursor-grab select-none items-center justify-center rounded-md hover:bg-white/55 focus-visible:outline-2 focus-visible:outline-current active:cursor-grabbing sm:size-8"
              >
                <GripVertical aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          />
        ))}
      </div>
    </>
  );
}
