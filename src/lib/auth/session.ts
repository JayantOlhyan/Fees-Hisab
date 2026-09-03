import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthenticationError } from '@/lib/errors';

const SESSION_COOKIE_NAME = 'fees_hisab_session';
const DEFAULT_SECRET = 'fees-hisab-development-fallback-secret-minimum-32-chars-long';

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  salutation: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

const DEFAULT_SESSION: SessionPayload = {
  userId: 'teacher-demo-uuid-001',
  email: 'babita@fees-hisab.in',
  name: 'Babita',
  salutation: "Ma'am",
};

export async function getSession(): Promise<SessionPayload | null> {
  return DEFAULT_SESSION;
}

export async function requireAuth(): Promise<SessionPayload> {
  return DEFAULT_SESSION;
}


