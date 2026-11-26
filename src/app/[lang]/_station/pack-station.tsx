"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  registerPackAction,
  selectPackerAction,
  type RegisterPackActionInput,
  type RegisterPackActionResult,
} from "../actions";
import { useI18n } from "@/i18n/client";
import { KINDS, MAX_EXTERNAL_LABEL, type Kind } from "@/lib/kinds";
import { createLocalStore } from "./local-store";

type Packer = { id: number; name: string };
type Chute = { number: string; status: "active" | "maintenance" | "out_of_service"; kind: Kind };
type QueuedPack = RegisterPackActionInput & { packedAt: string };
/** The packer selected on this device; `token` is set when PINs are required. */
type Selection = { id: number; token?: string } | null;
type Notice = { kind: "ok" | "error" | "info"; text: string } | null;

const selectionStore = createLocalStore<Selection>("station.packer", null);
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
  requirePin,
}: {
  packers: Packer[];
  parachutes: Chute[];
  timeZone: string;
  requirePin: boolean;
}) {
  const { d, f, p } = useI18n();
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
  const selection = selectionStore.useValue();
  const queue = queueStore.useValue();
  const [number, setNumber] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [offline, setOffline] = useState(false);
  const [pinFor, setPinFor] = useState<Packer | null>(null);
  /** "Paracaídas externo" mode: a parachute that isn't in the system. */
  const [externalMode, setExternalMode] = useState(false);
  const [externalKind, setExternalKind] = useState<Kind | null>(null);
  const [externalLabel, setExternalLabel] = useState("");
  const flushing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ignore a stored packer that has since been deactivated, or lacks a PIN token.
  const packer =
    packers.find((p) => p.id === selection?.id && (!requirePin || selection?.token)) ?? null;

  const flush = useCallback(
    async (currentClientId?: string) => {
      if (flushing.current) return;
      flushing.current = true;
      try {
        for (const item of queueStore.get()) {
          let res: RegisterPackActionResult;
          try {
            res = await registerPackAction(item);
          } catch {
            // Network/server down: keep it queued and retry later.
            setOffline(true);
            if (item.clientId === currentClientId) {
              setNotice({
                kind: "info",
                text: d.station.savedOffline,
              });
            }
            return;
          }
          setOffline(false);
          // Back online: the "saved offline" notice no longer applies.
          setNotice((n) => (n?.kind === "info" ? null : n));
          const isCurrent = item.clientId === currentClientId;
          if (!res.ok && res.error === "STATION_UNAUTHORIZED") {
            // Keep everything queued: the packs go through once the device is re-authorized.
            setNotice({ kind: "error", text: res.message });
            return;
          }
          if (!res.ok && res.error === "PACKER_PIN_REQUIRED") {
            selectionStore.set((s) => (s?.id === item.packerId ? null : s));
          }
          queueStore.set((q) => q.filter((x) => x.clientId !== item.clientId));
          if (res.ok) {
            if (isCurrent) {
              const { pack } = res;
              const what =
                pack.parachuteNumber ??
                f(d.common.externalWithLabel, { label: pack.externalLabel ?? "" });
              setNotice({
                kind: "ok",
                text: `${timeFmt.format(new Date(pack.packedAt))} — ${pack.packerName} — ${what} (${d.kind[pack.kind]})`,
              });
            }
          } else {
            setNotice({
              kind: "error",
              text: isCurrent ? res.message : f(d.station.pendingRejected, { message: res.message }),
            });
          }
        }
      } finally {
        flushing.current = false;
      }
    },
    [timeFmt, d, f],
  );

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

  function selectPacker(p: Packer) {
    setNotice(null);
    if (requirePin && !(selection?.id === p.id && selection.token)) {
      setPinFor(p);
      return;
    }
    selectionStore.set({ id: p.id, token: selection?.id === p.id ? selection.token : undefined });
    setPinFor(null);
    inputRef.current?.focus();
  }

  function onPinAccepted(p: Packer, token: string) {
    selectionStore.set({ id: p.id, token });
    setPinFor(null);
    // Focus after the PIN form unmounts.
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function enqueue(what: Pick<QueuedPack, "parachuteNumber" | "external">) {
    if (!packer) return;
    const item: QueuedPack = {
      clientId: uuid(),
      packerId: packer.id,
      packerToken: selection?.token,
      ...what,
      packedAt: new Date().toISOString(),
    };
    queueStore.set((q) => [...q, item]);
    void flush(item.clientId);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = number.trim();
    if (!packer) {
      setNotice({ kind: "error", text: d.station.selectPackerFirst });
      return;
    }
    if (!value) {
      inputRef.current?.focus();
      return;
    }
    enqueue({ parachuteNumber: value });
    setNumber("");
    inputRef.current?.focus();
  }

  function submitExternal(e: React.FormEvent) {
    e.preventDefault();
    const label = externalLabel.trim();
    if (!packer || !externalKind || !label) return;
    enqueue({ external: { kind: externalKind, label } });
    closeExternal();
  }

  function openExternal() {
    setExternalMode(true);
    setNotice(null);
    // Start from what was typed, if anything (e.g. an unknown number).
    if (number.trim()) setExternalLabel(number.trim());
    setNumber("");
  }

  function closeExternal() {
    setExternalMode(false);
    setExternalKind(null);
    setExternalLabel("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="packer-heading">
        <h2 id="packer-heading" className="mb-2 text-sm font-medium opacity-70">
          {d.station.whoAreYou}
        </h2>
        {packers.length === 0 ? (
          <p className="text-sm opacity-70">{d.station.noPackers}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {packers.map((p) => {
              const selected = p.id === packer?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPacker(p)}
                  aria-pressed={selected}
                  className={`rounded-xl border-2 px-4 py-5 text-lg font-medium break-words transition ${
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
        {pinFor && (
          <PinPrompt
            key={pinFor.id}
            packer={pinFor}
            onAccepted={onPinAccepted}
            onCancel={() => setPinFor(null)}
          />
        )}
      </section>

      {externalMode ? (
        <form onSubmit={submitExternal} aria-labelledby="external-heading" className="space-y-3">
          <h2 id="external-heading" className="text-sm font-medium opacity-70">
            {d.station.externalStep}
          </h2>
          <fieldset>
            <legend className="sr-only">{d.field.kind}</legend>
            <div className="grid grid-cols-2 gap-3">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setExternalKind(k)}
                  aria-pressed={externalKind === k}
                  className={`rounded-xl border-2 px-4 py-4 text-lg font-medium ${
                    externalKind === k
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-black/10 hover:border-blue-400 dark:border-white/15"
                  }`}
                >
                  {d.kind[k]}
                </button>
              ))}
            </div>
          </fieldset>
          <input
            value={externalLabel}
            onChange={(e) => setExternalLabel(e.target.value)}
            maxLength={MAX_EXTERNAL_LABEL}
            autoComplete="off"
            autoFocus
            placeholder={d.station.externalPlaceholder}
            aria-label={d.station.externalLabel}
            className="w-full rounded-xl border-2 border-black/15 bg-transparent px-4 py-3 text-lg outline-none focus:border-blue-600 dark:border-white/20"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!packer || !externalKind || !externalLabel.trim()}
              className="rounded-xl bg-green-600 px-6 py-3 text-lg font-semibold text-white disabled:opacity-40"
            >
              {d.station.registerExternal}
            </button>
            <button
              type="button"
              onClick={closeExternal}
              className="text-sm opacity-70 hover:underline"
            >
              {d.common.cancel}
            </button>
          </div>
          {packer && (
            <p className="text-sm opacity-70">
              {d.station.registeringAs} <strong>{packer.name}</strong>
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={submit} aria-labelledby="chute-heading">
          <h2 id="chute-heading" className="mb-2 text-sm font-medium opacity-70">
            {d.station.parachuteStep}
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
              placeholder={d.station.numberPlaceholder}
              aria-label={d.station.numberLabel}
              className="min-w-0 flex-1 rounded-xl border-2 border-black/15 bg-transparent px-4 py-4 text-2xl tracking-wider outline-none focus:border-blue-600 dark:border-white/20"
            />
            <button
              type="submit"
              disabled={!packer || !number.trim()}
              className="rounded-xl bg-green-600 px-6 text-lg font-semibold text-white disabled:opacity-40"
            >
              {d.station.register}
            </button>
          </div>
          <datalist id="parachute-numbers">
            {parachutes
              .filter((c) => c.status !== "out_of_service")
              .map((c) => (
                <option key={c.number} value={c.number} label={d.kind[c.kind]} />
              ))}
          </datalist>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="opacity-70">
              {packer && (
                <>
                  {d.station.registeringAs} <strong>{packer.name}</strong>
                </>
              )}
            </span>
            <button type="button" onClick={openExternal} className="text-blue-600 hover:underline">
              {d.station.openExternal}
            </button>
          </div>
        </form>
      )}

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
            {p(d.station.pending, queue.length)}
            {offline ? d.station.pendingOffline : "…"}
          </p>
        )}
      </div>
    </div>
  );
}

function PinPrompt({
  packer,
  onAccepted,
  onCancel,
}: {
  packer: Packer;
  onAccepted: (p: Packer, token: string) => void;
  onCancel: () => void;
}) {
  const { d, f } = useI18n();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await selectPackerAction({ packerId: packer.id, pin });
      if (res.ok) onAccepted(packer, res.token);
      else {
        setError(res.message);
        setPin("");
      }
    } catch {
      setError(d.station.offlineRetry);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-blue-600/40 p-3"
    >
      <label className="flex items-center gap-2">
        <span className="text-sm">{f(d.station.pinOf, { name: packer.name })}</span>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          autoFocus
          className="w-28 rounded-lg border-2 border-black/15 bg-transparent px-3 py-2 text-xl tracking-widest outline-none focus:border-blue-600 dark:border-white/20"
        />
      </label>
      <button
        type="submit"
        disabled={pending || pin.length < 4}
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
      >
        {d.station.pinEnter}
      </button>
      <button type="button" onClick={onCancel} className="text-sm opacity-70 hover:underline">
        {d.common.cancel}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}
