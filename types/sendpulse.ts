export type SendpulseLineRecord = {
  id: string;
  label: string;
  botPhone: string;
  tokenPrefix: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export type SendpulseEventRecord = {
  id: string;
  lineId: string | null;
  lineLabel: string | null;
  botPhone: string | null;
  contactId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  triggerKey: string | null;
  triggerLabel: string | null;
  outcome: string;
  outcomeLabel: string;
  httpStatus: number;
  errorMessage: string | null;
  emailSent: boolean;
  createdAt: string;
  /** Ficha del CRM cuando este contacto ya fue registrado. */
  clientId?: string | null;
};

export type SendpulseTokenReveal = {
  line: SendpulseLineRecord;
  token: string;
};
