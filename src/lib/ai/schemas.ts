// Fixed extraction schemas per document type (client-safe).
export const CONFIDENCE_THRESHOLD = 0.85;
export const MAX_TAGS = 8;

export type FieldDef = { key: string; list?: boolean };
export const EXTRACTION_SCHEMAS: Record<string, { schema: string; fields: FieldDef[] }> = {
  trade_certificate: { schema: "trade_certificate", fields: [{ key: "certificate_number" }, { key: "issuing_body" }, { key: "issue_date" }, { key: "expiry_date" }, { key: "holder_name" }, { key: "categories", list: true }] },
  national_id: { schema: "identity_document", fields: [{ key: "document_type" }, { key: "id_number" }, { key: "surname" }, { key: "given_names" }, { key: "date_of_birth" }, { key: "nationality" }] },
  company_registration: { schema: "company_registration", fields: [{ key: "registration_number" }, { key: "entity_name" }, { key: "incorporation_date" }, { key: "registered_address" }] },
  safety_certificate: { schema: "safety_certificate", fields: [{ key: "certificate_type" }, { key: "reference_number" }, { key: "issue_date" }, { key: "expiry_date" }] },
};

export type ExtractedValue = string | string[] | null;
export type ExtractedFields = Record<string, ExtractedValue>;

/** Bound a configurable schema before using it in AI output or edit forms. */
export function extractionDefinition(code: string, raw?: unknown): { schema: string; fields: FieldDef[] } | undefined {
  if (EXTRACTION_SCHEMAS[code]) return EXTRACTION_SCHEMAS[code];
  if (!raw || typeof raw !== 'object' || !('fields' in raw) || !Array.isArray(raw.fields)) return undefined;
  const fields: FieldDef[] = raw.fields.filter((f): f is FieldDef =>
    !!f && typeof f === 'object' && typeof f.key === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(f.key)
  ).slice(0, 20).map(f => ({key:f.key, list: f.list === true}));
  if (!fields.length) return undefined;
  const name = 'schema' in raw && typeof raw.schema === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(raw.schema) ? raw.schema : 'registered_document';
  return {schema:name, fields};
}
