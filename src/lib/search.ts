import { AREAS } from "./areas";

/**
 * Índice da busca global. Na Fase 1 cobre as áreas e páginas da plataforma.
 * Concursos, materiais e cursos entram no índice quando suas tabelas existirem.
 */
export type SearchEntry = {
  title: string;
  description: string;
  href: string;
  category: string;
  keywords: string[];
  available: boolean;
};

const STATIC_PAGES: SearchEntry[] = [
  { title: "Criar conta", description: "Cadastro gratuito com e-mail.", href: "/cadastro", category: "Conta", keywords: ["cadastro", "registrar", "conta"], available: true },
  { title: "Entrar", description: "Acesse seu painel.", href: "/entrar", category: "Conta", keywords: ["login", "acessar", "entrar"], available: true },
  { title: "Recuperar senha", description: "Receba um link para criar nova senha.", href: "/recuperar-senha", category: "Conta", keywords: ["senha", "esqueci"], available: true },
  { title: "Meu painel", description: "Seu espaço pessoal.", href: "/painel", category: "Conta", keywords: ["painel", "dashboard", "início"], available: true },
  { title: "Perfil", description: "Etapas, componentes e região de interesse.", href: "/painel/perfil", category: "Conta", keywords: ["perfil", "dados", "estado", "município"], available: true },
  { title: "Notificações", description: "Escolha o que receber e com que frequência.", href: "/painel/preferencias", category: "Conta", keywords: ["notificação", "alerta", "e-mail", "preferências"], available: true },
  { title: "Privacidade e dados", description: "Exporte seus dados ou exclua sua conta.", href: "/painel/conta", category: "Conta", keywords: ["exportar", "excluir", "LGPD", "dados"], available: true },
  { title: "Política de Privacidade", description: "Como tratamos dados pessoais.", href: "/privacidade", category: "Institucional", keywords: ["privacidade", "LGPD", "dados pessoais"], available: true },
  { title: "Termos de Uso", description: "Regras de uso da plataforma.", href: "/termos", category: "Institucional", keywords: ["termos", "regras", "uso"], available: true },
  { title: "Política de Cookies", description: "Quais cookies usamos e por quê.", href: "/cookies", category: "Institucional", keywords: ["cookies"], available: true },
  { title: "Suporte", description: "Canal de atendimento.", href: "/suporte", category: "Institucional", keywords: ["suporte", "ajuda", "contato", "atendimento"], available: true },
];

export const SEARCH_INDEX: SearchEntry[] = [
  ...AREAS.map((a) => ({
    title: a.title,
    description: a.description,
    href: `/${a.slug}`,
    category: a.group,
    keywords: a.keywords,
    available: a.status === "disponivel",
  })),
  ...STATIC_PAGES,
];

/** Remove acentos e caixa para comparar "avaliação" com "avaliacao". */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Distância de edição limitada, usada para tolerar pequenos erros de digitação. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

export function search(query: string, index: SearchEntry[] = SEARCH_INDEX): SearchEntry[] {
  const terms = normalize(query).split(/\s+/).filter((t) => t.length >= 2);
  if (terms.length === 0) return [];

  const scored = index.map((entry) => {
    const title = normalize(entry.title);
    const words = [title, normalize(entry.description), ...entry.keywords.map(normalize)].join(" ").split(/\s+/);
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += 5;
      else if (words.some((w) => w.startsWith(t))) score += 3;
      else if (t.length >= 4 && words.some((w) => withinOneEdit(w, t))) score += 1;
      else return { entry, score: 0 };
    }
    if (entry.available) score += 0.5;
    return { entry, score };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.entry);
}
