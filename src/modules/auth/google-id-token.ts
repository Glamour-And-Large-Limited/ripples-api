import { UnauthorizedException } from '@nestjs/common';

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string | null;
};

type TokenInfo = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
};

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleIdentity> {
  const url = new URL('https://oauth2.googleapis.com/tokeninfo');
  url.searchParams.set('id_token', idToken);

  let payload: TokenInfo;
  try {
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google sign-in');
    }
    payload = (await response.json()) as TokenInfo;
  } catch (error) {
    if (error instanceof UnauthorizedException) throw error;
    throw new UnauthorizedException('Invalid Google sign-in');
  }

  const emailVerified =
    payload.email_verified === true || payload.email_verified === 'true';
  if (
    payload.aud !== clientId ||
    !emailVerified ||
    !payload.sub ||
    !payload.email
  ) {
    throw new UnauthorizedException('Invalid Google sign-in');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name?.trim() || null,
  };
}
