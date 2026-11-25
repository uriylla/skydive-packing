import { jwtVerify, SignJWT } from "jose";

/**
 * Signed, stateless tokens (HS256 JWTs) used for the session cookies and for
 * packer PIN tokens. Kept free of Next.js imports so it can be unit tested.
 */
export type TokenPayload =
  | { kind: "admin"; uid: number }
  | { kind: "station"; sid: number }
  | { kind: "packer"; pid: number };

export type TokenKind = TokenPayload["kind"];

export const TOKEN_TTL_SECONDS: Record<TokenKind, number> = {
  admin: 12 * 60 * 60, // a working day
  station: 90 * 24 * 60 * 60, // device stays unlocked ~3 months (revocable)
  packer: 72 * 60 * 60, // outlives offline queue retries (up to 48 h)
};

const MIN_SECRET_LENGTH = 32;

function key(secret: string | undefined = process.env.SESSION_SECRET): Uint8Array {
  if (!secret || secret === "change-me" || secret.length < MIN_SECRET_LENGTH) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `SESSION_SECRET must be set to a random string of at least ${MIN_SECRET_LENGTH} characters.`,
      );
    }
    // Development fallback so a fresh checkout works; never used in production.
    secret = "dev-only-insecure-session-secret-0123456789";
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(
  payload: TokenPayload,
  opts: { secret?: string; now?: Date } = {},
): Promise<string> {
  const iat = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(iat + TOKEN_TTL_SECONDS[payload.kind])
    .sign(key(opts.secret));
}

/** Returns the payload if the token is valid, unexpired and of the given kind. */
export async function verifyToken<K extends TokenKind>(
  token: string | undefined,
  kind: K,
  opts: { secret?: string; now?: Date } = {},
): Promise<Extract<TokenPayload, { kind: K }> | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(opts.secret), {
      algorithms: ["HS256"],
      currentDate: opts.now,
    });
    if (payload.kind !== kind) return null;
    return payload as unknown as Extract<TokenPayload, { kind: K }>;
  } catch {
    return null;
  }
}
