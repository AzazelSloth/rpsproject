import { NextRequest, NextResponse } from 'next/server';

/**
 * Routes publiques qui ne nécessitent pas d'authentification
 */
const publicRoutes = ['/login', '/signup', '/forgot-password', '/survey-response'];

/**
 * Middleware de protection des routes
 * Redirige vers /login si l'utilisateur n'est pas authentifié
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Autoriser les routes publiques
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Autoriser les routes API (Next.js API routes)
  if (pathname.startsWith('/api/') || pathname.startsWith('/trpc/')) {
    return NextResponse.next();
  }

  // Autoriser les fichiers statiques et assets
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Vérifier l'authentification via les cookies (pas localStorage côté serveur)
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    // Rediriger vers login avec l'URL de retour
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Utilisateur authentifié, continuer
  return NextResponse.next();
}

/**
 * Configurer le matcher pour exclure les routes statiques
 */
export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - api (Next.js API routes)
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
