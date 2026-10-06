<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Data model
- Full multi-phase schema (phases 0-6) exists up front; later phases populate tables rather than migrate them. Why: avoid future schema migrations.
- Money is amount_minor bigint + currency code with a stored exchange rate (as_at); never floats or live FX. Why: accounting correctness.
- Roles live only in user_roles, checked via has_role()/is_staff()/is_operator() security-definer helpers. Why: prevent RLS recursion and privilege escalation.
- Every business table has a generic audit trigger writing append-only audit_events with HMAC'd IPs. Why: compliance trail without raw PII.

## App shell
- All UI strings come from the translations table via useT(key); new strings are added as translations data rows (not schema migrations). Why: future multi-language support without code changes.
- Module visibility/state is driven by feature_flags through PhaseModule (live component when flag on, planned preview otherwise); nav config lives in src/lib/nav.ts. Why: phases switch on without code changes.
- Demo role sign-in runs through a server function gated by the demo_login flag. Why: quick testing that can be switched off before go-live.
- Field-facing forms save drafts to IndexedDB and queue writes in an outbox (src/lib/offline/idb.ts) that syncs when online; server wins on conflict via suppliers.updated_at. Why: suppliers work without signal.
- Supplier self-service rules (no self-approval, submit requirements, document expiry) are enforced by database triggers, not the UI. Why: frontend must never be able to bypass approval.

## AI
- AI extraction/tagging runs in server functions (src/lib/ai.functions.ts) with strict JSON-schema output; AI writes go through the admin client after a caller check, and every AI result and human override is written to audit_events (ai_extracted / ai_tagged / ai_override). Why: bounded output and a who-said-what trail.
- AI capability rows are inserted with active=false and only count (matching, submit) once a human accepts them; submit is blocked by trigger while document extractions are unconfirmed. Why: never auto-approve.
