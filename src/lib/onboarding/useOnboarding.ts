import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { kv, outbox } from "@/lib/offline/idb";
import { ACCEPTED_FILES, MAX_FILE_BYTES, STEP_KEYS, TOTAL_STEPS, isExpired, newDraft, validateStep, validateSubmit, type Draft, type DocEntry } from "./model";
import { extractDocument, deleteDocument } from "@/lib/ai.functions";
import { ConflictError, NetworkError, applyOp, applyUpload, basicsOf, loadFromServer, type Op, type UploadOp } from "./sync";

export function useOnboarding(userId: string, t: (k: string) => string) {
  const scope = `onboarding:${userId}`;
  const draftKey = `draft:${scope}`;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [checking, setChecking] = useState<string[]>([]);
  const draftRef = useRef<Draft | null>(null);
  const syncingRef = useRef(false);

  const persist = useCallback((d: Draft) => {
    draftRef.current = d;
    setDraft(d);
    kv.set(draftKey, d).catch(() => {});
  }, [draftKey]);

  const refreshPending = useCallback(async () => setPending((await outbox.list(scope)).length), [scope]);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    if (!navigator.onLine) { setOnline(false); return; }
    syncingRef.current = true;
    setSyncing(true);
    try {
      for (const item of await outbox.list(scope)) {
        const op = item.payload as Op;
        const known = draftRef.current?.serverUpdatedAt ?? null;
        try {
          const updatedAt = op.type === "upload" ? await applyUpload(op as UploadOp, item.file!, known) : await applyOp(op, known);
          await outbox.remove(item.id);
          const d = { ...draftRef.current!, serverUpdatedAt: updatedAt };
          if (op.type === "step" && op.step === 4) {
            const c = op.data as Draft["capability"];
            d.syncedCapability = { assetClassIds: c.assetClassIds, systemIds: c.systemIds };
          }
          if (op.type === "upload") {
            d.documents = d.documents.map((x) => (x.id === op.doc.id ? { ...x, state: "uploaded" } : x));
            const docId = op.doc.id;
            setChecking((c) => [...c, docId]);
            extractDocument({ data: { documentId: docId } })
              .then(async (r: any) => {
                if (r?.status === "rejected") {
                  await deleteDocument({ data: { documentId: docId } }).catch(() => {});
                  const cur = draftRef.current;
                  if (cur) persist({ ...cur, documents: cur.documents.filter((x) => x.id !== docId) });
                  toast.error(t(r.reason ?? "wizard.err.not_document"), { duration: 10000 });
                }
              })
              .catch(() => {})
              .finally(() => setChecking((c) => c.filter((x) => x !== docId)));
          }
          if (op.type === "submit") d.status = "pending_review";
          persist(d);
          setLastError(null);
          setOnline(true);
        } catch (e) {
          if (e instanceof ConflictError) {
            await outbox.clear(scope);
            const server = await loadFromServer(userId).catch(() => null);
            persist(server ? { ...server, step: draftRef.current?.step ?? server.step } : newDraft());
            toast.info(t("wizard.conflict"));
          } else if (e instanceof NetworkError) {
            setOnline(false);
          } else {
            setLastError((e as Error).message);
          }
          break;
        }
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      refreshPending();
    }
  }, [scope, userId, persist, refreshPending, t]);

  // Initial load: local draft first; refresh from server (server wins) when online with nothing queued.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = (await kv.get<Draft>(draftKey).catch(() => undefined)) ?? null;
      const queued = await outbox.list(scope).catch(() => []);
      let next = local ?? newDraft();
      if (navigator.onLine && queued.length === 0) {
        try {
          const server = await loadFromServer(userId);
          if (server) next = { ...server, step: local?.supplierId === server.supplierId ? local.step : server.step };
        } catch { /* stay on local copy */ }
      }
      if (cancelled) return;
      persist(next);
      setOnline(navigator.onLine);
      setPending(queued.length);
      sync();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const timer = setInterval(() => { if (navigator.onLine) sync(); }, 20_000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); clearInterval(timer); };
  }, [sync]);

  const update = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    if (draftRef.current) persist({ ...draftRef.current, [key]: value });
  }, [persist]);

  const goTo = useCallback((step: number) => {
    if (draftRef.current) persist({ ...draftRef.current, step: Math.max(1, Math.min(TOTAL_STEPS, step)) });
  }, [persist]);

  /** Validates, queues the step for the server and moves on. Returns error keys. */
  const saveStep = useCallback(async (step: number): Promise<string[]> => {
    const d = draftRef.current!;
    const errors = validateStep(step, d);
    if (errors.length) return errors;
    if (step <= 9) {
      const op: Op = { type: "step", step, supplierId: d.supplierId, data: d[STEP_KEYS[step - 1] as keyof Draft], basics: basicsOf(d) };
      await outbox.add({ id: `${d.supplierId}:step:${step}`, scope, kind: "step", payload: op });
    }
    persist({ ...d, completed: Array.from(new Set([...d.completed, step])), step: Math.min(step + 1, TOTAL_STEPS) });
    await refreshPending();
    sync();
    return [];
  }, [persist, refreshPending, scope, sync]);

  const addDocument = useCallback(async (file: File, docType: DocEntry["docType"], expiresAt: string | null): Promise<string | null> => {
    if (!ACCEPTED_FILES.includes(file.type)) return "wizard.err.file_type";
    if (file.size > MAX_FILE_BYTES) return "wizard.err.file_size";
    if (isExpired(expiresAt)) return "wizard.err.expired";
    const d = draftRef.current!;
    const doc: DocEntry = { id: crypto.randomUUID(), docType, fileName: file.name, expiresAt, state: "queued" };
    const op: UploadOp = { type: "upload", supplierId: d.supplierId, doc, basics: basicsOf(d) };
    await outbox.add({ id: `${d.supplierId}:upload:${doc.id}`, scope, kind: "upload", payload: op, file });
    persist({ ...d, documents: [...d.documents, doc] });
    await refreshPending();
    sync();
    return null;
  }, [persist, refreshPending, scope, sync]);

  const removeDocument = useCallback(async (docId: string): Promise<string | null> => {
    const d = draftRef.current!;
    const doc = d.documents.find((x) => x.id === docId);
    if (!doc) return null;
    if (doc.state === "queued") {
      await outbox.remove(`${d.supplierId}:upload:${docId}`).catch(() => {});
    } else {
      try { await deleteDocument({ data: { documentId: docId } }); } catch { return "common.save_failed"; }
    }
    const cur = draftRef.current!;
    persist({ ...cur, status: cur.status === "pending_review" ? "draft" : cur.status, completed: cur.completed.filter((s) => s !== 10), documents: cur.documents.filter((x) => x.id !== docId) });
    await refreshPending();
    return null;
  }, [persist, refreshPending]);

  const submit = useCallback(async (): Promise<string[]> => {
    const d = draftRef.current!;
    const errors = validateSubmit(d);
    if (checking.length) errors.push("wizard.checking_doc");
    if (errors.length) return errors;
    await outbox.add({ id: `${d.supplierId}:submit`, scope, kind: "submit", payload: { type: "submit", supplierId: d.supplierId, basics: basicsOf(d) } satisfies Op });
    persist({ ...d, completed: Array.from(new Set([...d.completed, 10])) });
    await refreshPending();
    sync();
    return [];
  }, [persist, refreshPending, scope, sync, checking]);

  return { draft, update, goTo, saveStep, addDocument, removeDocument, checking, submit, sync, pending, syncing, online, lastError };
}
