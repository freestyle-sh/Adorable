import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
// Simple UUID v4 implementation without dependencies
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// TODO: replace this with the upcoming stack auth anonymous user and transition existing cookies to it. 
// https://github.com/stack-auth/stack-auth/issues/639
export async function middleware(req: Request) {
  const COOKIE_NAME = 'anonId';
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;

  if (!existing) {
    // generate and persist for 1 year
    cookieStore.set(COOKIE_NAME, generateUUID(), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  } else {
    // extend existing cookie for 1 year
    cookieStore.set(COOKIE_NAME, existing, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  
  return NextResponse.next();
}

// Define paths middleware should run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};