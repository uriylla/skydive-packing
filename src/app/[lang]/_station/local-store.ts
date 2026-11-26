"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny localStorage-backed store usable with useSyncExternalStore.
 * Keeps a parsed, referentially stable snapshot; syncs across tabs.
 */
export function createLocalStore<T>(key: string, fallback: T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      cache = fallback;
    }
    return cache;
  };

  const emit = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEvent) => {
    if (e.key === key) {
      cache = undefined;
      emit();
    }
  };

  return {
    get: read,
    set(next: T | ((prev: T) => T)) {
      const value = typeof next === "function" ? (next as (p: T) => T)(read()) : next;
      cache = value;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage full or disabled: keep the in-memory value at least.
      }
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    useValue(): T {
      return useSyncExternalStore(this.subscribe, read, () => fallback);
    },
  };
}
