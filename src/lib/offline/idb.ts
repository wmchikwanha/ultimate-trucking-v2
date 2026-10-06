/** Minimal IndexedDB wrapper: a key/value store and an ordered outbox. Browser only. */
const DB_NAME = "uts-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const kv = {
  get: <T>(key: string) => run<T | undefined>("kv", "readonly", (s) => s.get(key) as IDBRequest<T | undefined>),
  set: (key: string, value: unknown) => run("kv", "readwrite", (s) => s.put(value, key)),
  del: (key: string) => run("kv", "readwrite", (s) => s.delete(key)),
};

export type OutboxItem = {
  id: string;
  seq: number;
  scope: string;
  kind: string;
  payload: unknown;
  file?: Blob;
  createdAt: string;
};

let seqCounter = 0;
export const outbox = {
  async list(scope: string): Promise<OutboxItem[]> {
    const all = await run<OutboxItem[]>("outbox", "readonly", (s) => s.getAll() as IDBRequest<OutboxItem[]>);
    return all.filter((i) => i.scope === scope).sort((a, b) => a.seq - b.seq);
  },
  add(item: Omit<OutboxItem, "seq" | "createdAt">) {
    return run("outbox", "readwrite", (s) => s.put({ ...item, seq: Date.now() * 1000 + (seqCounter++ % 1000), createdAt: new Date().toISOString() }));
  },
  remove: (id: string) => run("outbox", "readwrite", (s) => s.delete(id)),
  async clear(scope: string) {
    for (const i of await outbox.list(scope)) await outbox.remove(i.id);
  },
};
