/** Rotas que exigem sessão. Verificadas no middleware E novamente nas páginas. */
export const PROTECTED_PREFIXES = ["/painel", "/boas-vindas", "/api/conta"];

/** Rotas de autenticação: quem já está logado é levado ao painel. */
export const AUTH_ONLY_PATHS = ["/entrar", "/cadastro"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_PATHS.includes(pathname);
}
