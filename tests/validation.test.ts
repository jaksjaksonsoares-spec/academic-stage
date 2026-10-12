import { describe, expect, it } from "vitest";
import {
  deleteAccountSchema,
  formDataToObject,
  interestsSchema,
  password,
  profileSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation";

describe("senha", () => {
  it("aceita senha forte", () => {
    expect(password.safeParse("professora2026").success).toBe(true);
  });
  it.each(["curta1", "somenteletrasaqui", "1234567890123", "aaaaaaaaaaaa"])("rejeita %j", (p) => {
    expect(password.safeParse(p).success).toBe(false);
  });
});

describe("cadastro", () => {
  const ok = { displayName: "Jax", email: " JAX@Exemplo.com ", password: "ingles2026abc", acceptTerms: "on" };

  it("normaliza o e-mail", () => {
    const r = signUpSchema.safeParse(ok);
    expect(r.success && r.data.email).toBe("jax@exemplo.com");
  });

  it("exige aceite dos termos", () => {
    const { acceptTerms: _, ...semAceite } = ok;
    const r = signUpSchema.safeParse(semAceite);
    expect(r.success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    expect(signUpSchema.safeParse({ ...ok, email: "nao-e-email" }).success).toBe(false);
  });
});

describe("redefinição de senha", () => {
  it("exige confirmação igual", () => {
    expect(resetPasswordSchema.safeParse({ password: "novasenha2026", confirm: "outra2026xx" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "novasenha2026", confirm: "novasenha2026" }).success).toBe(true);
  });
});

describe("perfil", () => {
  it("converte listas separadas por vírgula e limita tamanho", () => {
    const muitos = Array.from({ length: 15 }, (_, i) => `Cidade ${i}`).join(", ");
    const r = profileSchema.parse({ displayName: "Jax", uf: "SP", municipios: muitos, etapas: ["medio"], componentes: "Inglês, Arte" });
    expect(r.municipios).toHaveLength(10);
    expect(r.componentes).toEqual(["Inglês", "Arte"]);
  });

  it("rejeita UF e etapa inexistentes", () => {
    expect(profileSchema.safeParse({ displayName: "Jax", uf: "XX" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "Jax", etapas: ["inventada"] }).success).toBe(false);
  });

  it("aceita UF vazia (não informar)", () => {
    expect(profileSchema.safeParse({ displayName: "Jax", uf: "" }).success).toBe(true);
  });
});

describe("interesses e exclusão", () => {
  it("só aceita interesses conhecidos", () => {
    expect(interestsSchema.safeParse({ interesses: ["preparar-aulas"] }).success).toBe(true);
    expect(interestsSchema.safeParse({ interesses: ["hackear"] }).success).toBe(false);
  });

  it("exige a palavra EXCLUIR exata", () => {
    expect(deleteAccountSchema.safeParse({ confirmation: "excluir", password: "x" }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ confirmation: "EXCLUIR", password: "x" }).success).toBe(true);
  });
});

describe("formDataToObject", () => {
  it("agrupa campos repetidos em listas e garante listas vazias", () => {
    const fd = new FormData();
    fd.append("etapas", "medio");
    fd.append("etapas", "infantil");
    fd.append("displayName", "Jax");
    expect(formDataToObject(fd, ["etapas", "interesses"])).toEqual({
      etapas: ["medio", "infantil"],
      displayName: "Jax",
      interesses: [],
    });
  });
});
