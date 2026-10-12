import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isAuthOnlyPath, isProtectedPath } from "@/lib/routes";
import { buildCsp } from "@/lib/csp";

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const { pathname } = request.nextUrl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    // Renova a sessão e valida o token no servidor de autenticação.
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user && isProtectedPath(pathname)) {
      if (pathname.startsWith("/api/")) {
        return withCsp(NextResponse.json({ error: "Não autenticado." }, { status: 401 }), csp);
      }
      const login = request.nextUrl.clone();
      login.pathname = "/entrar";
      login.search = `?next=${encodeURIComponent(pathname)}`;
      return withCsp(copyCookies(response, NextResponse.redirect(login)), csp);
    }

    if (user && isAuthOnlyPath(pathname)) {
      const home = request.nextUrl.clone();
      home.pathname = "/painel";
      home.search = "";
      return withCsp(copyCookies(response, NextResponse.redirect(home)), csp);
    }
  } else if (isProtectedPath(pathname)) {
    // Sem Supabase configurado não há como haver sessão: nunca libera a área privada.
    const login = request.nextUrl.clone();
    login.pathname = "/entrar";
    login.search = "";
    return withCsp(NextResponse.redirect(login), csp);
  }

  return withCsp(response, csp);
}

function withCsp(res: NextResponse, csp: string) {
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
  return to;
}

export const config = {
  matcher: [
    // Tudo, exceto arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
