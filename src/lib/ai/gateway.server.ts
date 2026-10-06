// Server-only helper: one streamed Responses call that returns strict-schema JSON.
export const AI_MODEL = "openai/gpt-6-astra";
const BASE = "https://ai.gateway.lovable.dev";

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function structuredResponse<T>(opts: {
  instructions: string;
  content: Record<string, unknown>[];
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new GatewayError(401, "AI is not configured");
  const res = await fetch(`${BASE}/v1/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: AI_MODEL,
      instructions: opts.instructions,
      input: [{ role: "user", content: opts.content }],
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      text: { format: { type: "json_schema", name: opts.schemaName, strict: true, schema: opts.schema } },
    }),
  });
  if (!res.ok || !res.body) {
    let msg = `AI request failed (${res.status})`;
    try { const j = await res.json(); msg = j?.error?.message ?? j?.message ?? msg; } catch { /* keep default */ }
    throw new GatewayError(res.status, msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "", refusal = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let ev: { type?: string; delta?: string; error?: { message?: string } };
        try { ev = JSON.parse(data); } catch { continue; }
        if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        else if (ev.type === "response.refusal.delta" && ev.delta) refusal += ev.delta;
        else if (ev.type === "error" || ev.type === "response.failed") throw new GatewayError(500, ev.error?.message ?? "AI request failed");
      }
    }
  }
  if (!text.trim()) throw new GatewayError(422, refusal ? "The AI declined to read this item" : "The AI returned no result");
  return JSON.parse(text) as T;
}
