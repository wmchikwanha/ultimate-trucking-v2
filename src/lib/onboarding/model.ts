import type { Database } from "@/integrations/supabase/types";

export type SupplierKind = Database["public"]["Enums"]["supplier_kind"];
export type SupplierStatus = Database["public"]["Enums"]["supplier_status"];

export const TOTAL_STEPS = 10;
export const STEP_KEYS = ["identity", "business", "trade", "capability", "faults", "equipment", "coverage", "commercial", "references", "review"] as const;

export const BUSINESS_KINDS: SupplierKind[] = ["workshop", "recovery_operator", "parts_supplier", "logistics", "telematics_installer", "marketplace_participant"];
export const LOCALES = ["en", "tn", "af", "zu", "sn", "ny", "pt", "ng"] as const;
export const EQUIPMENT = ["tow_truck", "flatbed", "service_vehicle", "diagnostic_laptop", "air_compressor", "welding_machine", "generator", "hydraulic_jack", "tyre_changer", "crane"] as const;
export const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  BW: ["gaborone", "francistown", "lobatse", "mahalapye", "palapye", "selebi_phikwe", "serowe", "maun", "kasane", "nata", "ghanzi", "kang", "tsabong"],
  NA: ["windhoek", "walvis_bay", "katima_mulilo", "gobabis", "oshakati"],
  ZA: ["johannesburg", "pretoria", "durban", "cape_town", "polokwane", "mahikeng", "beitbridge_za"],
  ZW: ["harare", "bulawayo", "beitbridge", "victoria_falls", "mutare", "chirundu"],
  ZM: ["lusaka", "kazungula", "livingstone", "ndola", "kitwe", "solwezi"],
  MZ: ["maputo", "beira", "tete", "nacala", "ressano_garcia"],
  CD: ["lubumbashi", "kolwezi", "kasumbalesa"],
  AO: ["luanda", "lobito", "benguela", "lubango"],
};
export const PAYMENT_PREFS = ["bank_transfer", "mobile_money", "cash"] as const;
export const DOC_TYPES = ["company_registration", "trade_certificate", "safety_certificate", "national_id"] as const;
export const ACCEPTED_FILES = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const E164 = /^\+[1-9]\d{7,14}$/;

export type DocEntry = {
  id: string; // client-generated uuid, reused as supplier_documents.id
  docType: (typeof DOC_TYPES)[number];
  fileName: string;
  expiresAt: string | null;
  state: "queued" | "uploaded";
};

export type Draft = {
  supplierId: string;
  serverUpdatedAt: string | null;
  status: SupplierStatus;
  step: number;
  completed: number[];
  identity: { fullName: string; idNumber: string; phone: string; locale: string };
  business: { legalName: string; tradingName: string; registrationNumber: string; countryCode: string };
  trade: { kind: SupplierKind | "" };
  capability: { assetClassIds: string[]; makeIds: string[]; modelIds: string[]; systemIds: string[] };
  /** Last capability selection confirmed saved on the server. */
  syncedCapability: { assetClassIds: string[]; systemIds: string[] } | null;
  faults: { faultTypeIds: string[] };
  equipment: Record<string, number>;
  coverage: { radiusKm: number; countries: string[]; regions: string[] };
  commercial: { currency: string; paymentPreference: string; emergency: boolean };
  references: { name: string; phone: string; company: string }[];
  documents: DocEntry[];
};

export const newDraft = (): Draft => ({
  supplierId: crypto.randomUUID(),
  serverUpdatedAt: null,
  status: "draft",
  step: 1,
  completed: [],
  identity: { fullName: "", idNumber: "", phone: "+267", locale: "en" },
  business: { legalName: "", tradingName: "", registrationNumber: "", countryCode: "BW" },
  trade: { kind: "" },
  capability: { assetClassIds: [], makeIds: [], modelIds: [], systemIds: [] },
  syncedCapability: null,
  faults: { faultTypeIds: [] },
  equipment: {},
  coverage: { radiusKm: 100, countries: ["BW"], regions: [] },
  commercial: { currency: "BWP", paymentPreference: "", emergency: false },
  references: [{ name: "", phone: "", company: "" }, { name: "", phone: "", company: "" }],
  documents: [],
});

const today = () => new Date().toISOString().slice(0, 10);

/** Returns translation keys of validation errors for a step (empty = valid). */
export function validateStep(step: number, d: Draft): string[] {
  const e: string[] = [];
  switch (step) {
    case 1:
      if (d.identity.fullName.trim().length < 2) e.push("wizard.err.full_name");
      if (d.identity.idNumber.trim().length < 4) e.push("wizard.err.id_number");
      if (!E164.test(d.identity.phone.trim())) e.push("wizard.err.phone");
      break;
    case 2:
      if (d.business.legalName.trim().length < 2) e.push("wizard.err.legal_name");
      if (d.documents.some((x) => x.expiresAt && x.expiresAt < today())) e.push("wizard.err.expired");
      break;
    case 3:
      if (!d.trade.kind) e.push("wizard.err.kind");
      else if (BUSINESS_KINDS.includes(d.trade.kind) && !d.business.registrationNumber.trim()) e.push("wizard.err.registration");
      break;
    case 4:
      if (!d.capability.assetClassIds.length || !d.capability.systemIds.length) e.push("wizard.err.capability");
      break;
    case 7:
      if (!(d.coverage.radiusKm > 0)) e.push("wizard.err.radius");
      if (!d.coverage.countries.length) e.push("wizard.err.countries");
      break;
    case 8:
      if (!d.commercial.paymentPreference) e.push("wizard.err.payment");
      break;
    case 9:
      d.references.forEach((r) => {
        if (r.name.trim().length < 2 || !E164.test(r.phone.trim())) e.push("wizard.err.reference");
      });
      break;
    case 10:
      if (d.documents.some((x) => x.expiresAt && x.expiresAt < today())) e.push("wizard.err.expired");
      break;
  }
  return Array.from(new Set(e));
}

export function validateSubmit(d: Draft): string[] {
  const errs: string[] = [];
  for (let s = 1; s <= TOTAL_STEPS; s++) errs.push(...validateStep(s, d));
  return Array.from(new Set(errs));
}

export const isExpired = (date: string | null) => !!date && date < today();
export const expiresSoon = (date: string | null) => {
  if (!date) return false;
  const days = (new Date(date).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days < 30;
};
