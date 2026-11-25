/** Parachute types. Packers are paid differently for each. Safe to import in client code. */
export const KINDS = ["tandem", "normal"] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = { tandem: "Tándem", normal: "Normal" };
/** One-letter form for compact counts ("8 T · 4 N"). */
export const KIND_SHORT: Record<Kind, string> = { tandem: "T", normal: "N" };

export const MAX_EXTERNAL_LABEL = 60;
