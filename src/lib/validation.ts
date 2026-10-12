import { z } from "zod";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const ETAPAS = [
  { value: "infantil", label: "Educação Infantil" },
  { value: "fundamental-iniciais", label: "Fundamental — anos iniciais" },
  { value: "fundamental-finais", label: "Fundamental — anos finais" },
  { value: "medio", label: "Ensino Médio" },
  { value: "eja", label: "EJA" },
  { value: "superior", label: "Ensino Superior" },
  { value: "idiomas", label: "Ensino de idiomas" },
  { value: "gestao", label: "Gestão e coordenação" },
  { value: "licenciatura", label: "Estudante de licenciatura" },
] as const;

export const INTERESSES = [
  { value: "preparar-aulas", label: "Preparar aulas" },
  { value: "atividades-provas", label: "Criar atividades e provas" },
  { value: "encontrar-concursos", label: "Encontrar concursos" },
  { value: "estudar-concursos", label: "Estudar para concursos" },
  { value: "cursos", label: "Buscar cursos e especializações" },
  { value: "rotina", label: "Organizar a rotina profissional" },
  { value: "inclusao", label: "Explorar recursos de inclusão" },
  { value: "novidades", label: "Acompanhar novidades educacionais" },
] as const;

const etapaValues = ETAPAS.map((e) => e.value) as [string, ...string[]];
const interesseValues = INTERESSES.map((i) => i.value) as [string, ...string[]];

const email = z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(254);

/** Senha: mínimo 10 caracteres, com letra e número. Bloqueia senhas óbvias. */
export const password = z
  .string()
  .min(10, "A senha precisa ter pelo menos 10 caracteres.")
  .max(128, "A senha pode ter no máximo 128 caracteres.")
  .refine((v) => /[A-Za-zÀ-ÿ]/.test(v) && /\d/.test(v), "Use letras e números na senha.")
  .refine((v) => !/^(.)\1+$/.test(v), "Escolha uma senha menos previsível.");

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Informe como quer ser chamado.").max(80),
  email,
  password,
  acceptTerms: z.literal("on", { errorMap: () => ({ message: "É preciso aceitar os Termos de Uso." }) }),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha.").max(128),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "As senhas não coincidem.", path: ["confirm"] });

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Informe como quer ser chamado.").max(80),
  uf: z.union([z.enum(UFS), z.literal("")]).optional(),
  municipios: z
    .string()
    .max(500)
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10)
        .map((s) => s.slice(0, 80)),
    ),
  etapas: z.array(z.enum(etapaValues)).max(ETAPAS.length).default([]),
  componentes: z
    .string()
    .max(500)
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12)
        .map((s) => s.slice(0, 60)),
    ),
  objetivos: z.string().trim().max(500).optional().default(""),
});

export const interestsSchema = z.object({
  interesses: z.array(z.enum(interesseValues)).max(INTERESSES.length).default([]),
});

export const notificationSchema = z.object({
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  frequency: z.enum(["imediata", "diaria", "semanal"]),
  topics: z.array(z.enum(["prazos", "novos-concursos", "estudos", "novidades"])).default([]),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("EXCLUIR", { errorMap: () => ({ message: 'Digite EXCLUIR em maiúsculas para confirmar.' }) }),
  password: z.string().min(1, "Informe sua senha.").max(128),
});

/** Converte FormData em objeto, agrupando campos repetidos em arrays. */
export function formDataToObject(fd: FormData, arrayKeys: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = arrayKeys.includes(key) ? all : all[0];
  }
  for (const k of arrayKeys) if (!(k in out)) out[k] = [];
  return out;
}

/** Primeiro erro de cada campo, no formato que os formulários exibem. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
