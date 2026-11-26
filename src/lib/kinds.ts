/** Parachute types. Packers are paid differently for each. Safe to import in client code. */
export const KINDS = ["tandem", "normal"] as const;
export type Kind = (typeof KINDS)[number];

export const MAX_EXTERNAL_LABEL = 60;
