export interface IsapreRecord {
  id: string;
  name: string;
  active: boolean;
  gesPremiumUf: number;
  gesPremiumUfLegacy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateIsapreGesInput {
  gesPremiumUf?: number;
  gesPremiumUfLegacy?: number | null;
}
