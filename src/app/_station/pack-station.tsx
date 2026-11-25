"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { registerPackAction, type RegisterPackActionInput } from "../actions";
import { createLocalStore } from "./local-store";

type Packer = { id: number; name: string };
type Chute = { number: string; status: "active" | "maintenance" | "out_of_service" };
type QueuedPack = Required<RegisterPackActionInput>;
type Notice = { kind: "ok" | "error" | "info"; text: string } | null;

const selectedPackerStore = createLocalStore<number | null>("station.packerId", null);
const queueStore = createLocalStore<QueuedPack[]>("station.queue", []);

const RETRY_MS = 15_000;

function uuid(): string {
  // crypto.randomUUID needs a secure context (https or localhost).
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function PackStation({
  packers,
  parachutes,
  timeZone,
}: {
  packers: Packer[];
  parachutes: Chute[];
  timeZone: string;
}) {
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
    [timeZone],
  );
  const storedPackerId = selectedPackerStore.useValue();
  const queue = queueStore.useValue();
  const [number, setNumber] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [offline, setOffline] = useState(false);
  const flushing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ignore a stored packer that has since been deactivated.
  const packer = packers.find((p) => p.id === storedPackerId) ?? null;

  const flush = useCallback(async (currentClientId?: string) => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const item of queueStore.get()) {
        let res: Awaited<ReturnType<typeof registerPackAction>>;
        try {
          res = await registerPackAction(item);
        } catch {
          // Network/server down: keep it queued and retry later.
          setOffline(true);
          if (item.clientId === currentClientId) {
            setNotice({
              kind: "info",
              text: "Sin conexión. El plegado se ha guardado y se enviará automáticamente.",
            });
          }
          return;
        }
        setOffline(false);
        queueStore.set((q) => q.filter((x) => x.clientId !== item.clientId));
        const isCurrent = item.clientId === currentClientId;
        if (res.ok) {
          if (isCurrent) {
            const { pack } = res;
            setNotice({
              kind: "ok",
              text: `${timeFmt.format(new Date(pack.packedAt))} — ${pack.packerName} — ${pack.parachuteNumber}`,
            });
          }
        } else {
          setNotice({
            kind: "error",
            text: isCurrent ? res.message : `Plegado pendiente rechazado: ${res.message}`,
          });
        }
      }
    } finally {
      flushing.current = false;
    }
  }, [timeFmt]);

  // Retry queued packs periodically and when the connection comes back.
  useEffect(() => {
    const retry = () => {
      if (queueStore.get().length > 0) void flush();
    };
    retry();
    const id = window.setInterval(retry, RETRY_MS);
    window.addEventListener("online", retry);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", retry);
    };
  }, [flush]);

  // Auto-hide success messages.
  useEffect(() => {
    if (notice?.kind !== "ok") return;
    const id = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(id);
  }, [notice]);

  function selectPacker(id: number) {
    selectedPackerStore.set(id);
    setNotice(null);
    inputRef.current?.focus();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = number.trim();
    if (!packer) {
      setNotice({ kind: "error", text: "Selecciona primero tu nombre." });
      return;
    }
    if (!value) {
      inputRef.current?.focus();
      return;
    }
    const item: QueuedPack = {
      clientId: uuid(),
      packerId: packer.id,
      parachuteNumber: value,
      packedAt: new Date().toISOString(),
    };
    queueStore.set((q) => [...q, item]);
    setNumber("");
    inputRef.current?.focus();
    void flush(item.clientId);
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="packer-heading">
        <h2 id="packer-heading" className="mb-2 text-sm font-medium opacity-70">
          1. ¿Quién eres?
        </h2>
        {packers.length === 0 ? (
          <p className="text-sm opacity-70">No hay plegadores activos.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {packers.map((p) => {
              const selected = p.id === packer?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPacker(p.id)}
                  aria-pressed={selected}
                  className={`rounded-xl border-2 px-4 py-5 text-lg font-medium transition ${
                    selected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-black/10 hover:border-blue-400 dark:border-white/15"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <form onSubmit={submit} aria-labelledby="chute-heading">
        <h2 id="chute-heading" className="mb-2 text-sm font-medium opacity-70">
          2. Paracaídas
        </h2>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            list="parachute-numbers"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="Ej. 023"
            aria-label="Número de paracaídas"
            className="min-w-0 flex-1 rounded-xl border-2 border-black/15 bg-transparent px-4 py-4 text-2xl tracking-wider outline-none focus:border-blue-600 dark:border-white/20"
          />
          <button
            type="submit"
            disabled={!packer || !number.trim()}
            className="rounded-xl bg-green-600 px-6 text-lg font-semibold text-white disabled:opacity-40"
          >
            Registrar
          </button>
        </div>
        <datalist id="parachute-numbers">
          {parachutes
            .filter((c) => c.status !== "out_of_service")
            .map((c) => (
              <option key={c.number} value={c.number} />
            ))}
        </datalist>
        {packer && (
          <p className="mt-2 text-sm opacity-70">
            Registrando como <strong>{packer.name}</strong>
          </p>
        )}
      </form>

      <div aria-live="polite" className="min-h-14">
        {notice && (
          <p
            role={notice.kind === "error" ? "alert" : "status"}
            className={`rounded-xl px-4 py-3 text-lg font-medium ${
              notice.kind === "ok"
                ? "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100"
                : notice.kind === "error"
                  ? "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100"
                  : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
            }`}
          >
            {notice.kind === "ok" && "✓ "}
            {notice.text}
          </p>
        )}
        {queue.length > 0 && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            {queue.length} plegado{queue.length > 1 ? "s" : ""} pendiente
            {queue.length > 1 ? "s" : ""} de enviar
            {offline ? " (sin conexión, reintentando…)" : "…"}
          </p>
        )}
      </div>
    </div>
  );
}
