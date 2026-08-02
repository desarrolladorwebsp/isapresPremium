"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ADMIN_HOME_PATH, ADMIN_USERS_PATH } from "@/lib/auth/constants";
import { horizontalScrollRail, touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export type ExecutiveAdminModule = "prospectos" | "usuarios";

export interface ExecutiveAdminLayoutProps {
  activeModule: ExecutiveAdminModule;
  onModuleChange?: (module: ExecutiveAdminModule) => void;
  children: React.ReactNode;
}

const modules: {
  id: ExecutiveAdminModule;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: "prospectos",
    label: "Prospectos",
    shortLabel: "Prospectos",
    description: "Gestión de leads y asignaciones",
  },
  {
    id: "usuarios",
    label: "Usuarios",
    shortLabel: "Usuarios",
    description: "Ejecutivos, invitaciones y permisos de asignación",
  },
];

export function ExecutiveAdminLayout({
  activeModule,
  onModuleChange,
  children,
}: ExecutiveAdminLayoutProps) {
  const current = modules.find((module) => module.id === activeModule);

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={joinClasses(
          "overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-500/10 via-white to-white p-5 shadow-sm sm:p-6",
          ui.border,
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Administración
        </p>
        <h1 className="mt-1 text-xl font-bold text-primary-dark sm:text-2xl">
          {current?.label ?? "Panel administrativo"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {current?.description ??
            "Herramientas de administración integradas al dashboard del ejecutivo."}
        </p>
      </motion.section>

      <nav
        className={joinClasses(
          "premium-executive-tabs rounded-xl border bg-white px-2 py-2 shadow-sm",
          ui.border,
        )}
        aria-label="Módulos de administración"
      >
        <div className={joinClasses(horizontalScrollRail, "flex gap-1")}>
          {modules.map((module) => {
            const isActive = module.id === activeModule;
            const className = joinClasses(
              "shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
              touchTarget,
              isActive
                ? "premium-executive-tab-active bg-primary text-primary-foreground shadow-sm"
                : joinClasses("text-muted", ui.hoverSurface),
            );

            if (onModuleChange) {
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => onModuleChange(module.id)}
                  className={className}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="sm:hidden">{module.shortLabel}</span>
                  <span className="hidden sm:inline">{module.label}</span>
                </button>
              );
            }

            return (
              <span
                key={module.id}
                className={className}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="sm:hidden">{module.shortLabel}</span>
                <span className="hidden sm:inline">{module.label}</span>
              </span>
            );
          })}

          <Link
            href={ADMIN_HOME_PATH}
            className={joinClasses(
              "shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-muted transition",
              touchTarget,
              ui.hoverSurface,
            )}
          >
            <span className="sm:hidden">Catálogo</span>
            <span className="hidden sm:inline">Catálogo admin</span>
          </Link>

          <Link
            href={ADMIN_USERS_PATH}
            className={joinClasses(
              "shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-muted transition",
              touchTarget,
              ui.hoverSurface,
            )}
          >
            <span className="sm:hidden">Staff</span>
            <span className="hidden sm:inline">Usuarios (panel completo)</span>
          </Link>
        </div>
      </nav>

      {children}
    </div>
  );
}
