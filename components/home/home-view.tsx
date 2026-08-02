"use client";

import { motion } from "framer-motion";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldGroup,
  FieldHint,
  FieldLabel,
  Input,
  Select,
} from "@/components/ui";

export function HomeView() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-12 text-foreground sm:px-6">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-2"
        >
          <p className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground/80">
            Arquitectura base inicial
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Cotizador Virtual de planes Isapre
          </h1>
          <p className="max-w-3xl text-sm text-foreground/75 sm:text-base">
            Base de proyecto con componentes atómicos reutilizables, tokens de
            diseño centralizados y stack preparado para flujos de cotización de
            alto rendimiento.
          </p>
        </motion.header>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Simulación rápida de cotización</CardTitle>
            <CardDescription>
              Formulario inicial para validar experiencia, escaneabilidad y
              consistencia visual.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FieldGroup>
              <FieldLabel htmlFor="age">Edad del afiliado</FieldLabel>
              <Input id="age" name="age" type="number" placeholder="Ej: 34" />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="region">Región</FieldLabel>
              <Select
                id="region"
                name="region"
                placeholder="Selecciona una región"
                options={[
                  { value: "metropolitana", label: "Región Metropolitana" },
                  { value: "valparaiso", label: "Valparaíso" },
                  { value: "biobio", label: "Biobío" },
                ]}
              />
            </FieldGroup>

            <FieldGroup className="sm:col-span-2">
              <FieldLabel htmlFor="budget">Presupuesto mensual</FieldLabel>
              <Input
                id="budget"
                name="budget"
                type="number"
                placeholder="Ej: 120000"
              />
              <FieldHint>
                Ingresa el monto en pesos chilenos para filtrar planes
                recomendados.
              </FieldHint>
            </FieldGroup>

            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button>Generar cotización</Button>
              <Button variant="secondary">Guardar borrador</Button>
              <Button variant="ghost">Limpiar formulario</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
