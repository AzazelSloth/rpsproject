import { NextRequest, NextResponse } from 'next/server';

/**
 * Routes publiques qui ne nécessitent pas d'authentification
 */
const publicRoutes = ['/login', '/signup', '/forgot-password', '/survey-response'];

/**
 * Proxy de protection des routes - MODE SOUPLE
 *
 * Permet l'accès à toutes les routes (mode demo)
 * La protection côté backend se fait via AuthGuard
 * Le frontend fallback sur les données de démo si pas de backend
 */
export function proxy(request: NextRequest) {
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

  // MODE DEMO : On laisse passer toutes les requêtes
  // Les pages gèrent elles-mêmes le fallback vers les données de démo
  // Si le backend retourne 401, le frontend catch et utilise les données de démo
  
  // Si l'utilisateur a un token, on le laisse passer
  const authToken = request.cookies.get('auth_token')?.value;
  if (authToken) {
    return NextResponse.next();
  }

  // PAS de redirection vers /login - on permet l'accès en mode demo
  // Le login page a un bouton "Accéder à la demo admin" qui bypass l'auth
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
