import type { ClinicLocationRecord } from "@/types/clinic-location";

export interface Clinic {
  id: string;
  name: string;
  zones: string[];
  /**
   * Ubicación editable desde el panel administrativo. Cuando existe, tiene
   * prioridad sobre el asset estático `clinic-locations.json` en el mapa.
   */
  location?: ClinicLocationRecord | null;
}

export type ClinicInput = Clinic;
