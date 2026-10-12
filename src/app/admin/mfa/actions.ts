"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { authLimiter } from "@/lib/rate-limit";

export type MfaInicio = { ok: true; factorId: string; qr: string; secret: string } | { ok: false; message: string };

export async function iniciarMfa(): Promise<MfaInicio> {
  const { supabase } = await requireUser("/admin/mfa");
  const { data: papel } = await supabase.rpc("tem_papel_administrativo");
  if (papel !== true) return { ok: false, message: "Sem permissão." };

  // Remove cadastros iniciados e não concluídos, para não acumular fatores pendentes.
  const { data: fatores } = await supabase.auth.mfa.listFactors();
  for (const f of fatores?.all ?? []) {
    if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `AcademiC Stage ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return { ok: false, message: "Não foi possível iniciar o cadastro do segundo fator. Verifique se o MFA está ativado no Supabase." };
  return { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export type MfaVerificacao = { ok: false; message: string } | undefined;

export async function verificarMfa(_prev: MfaVerificacao, fd: FormData): Promise<MfaVerificacao> {
  const { supabase, user } = await requireUser("/admin/mfa");
  const factorId = z.string().min(1).max(100).safeParse(fd.get("factorId"));
  const code = z.string().regex(/^\d{6}$/).safeParse(String(fd.get("code") ?? "").replace(/\s/g, ""));
  if (!factorId.success || !code.success) return { ok: false, message: "Digite os 6 números do aplicativo autenticador." };
  if (!authLimiter.check(`mfa:${user.id}`).ok) return { ok: false, message: "Muitas tentativas. Aguarde alguns minutos." };

  const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId: factorId.data });
  if (e1 || !ch) return { ok: false, message: "Não foi possível iniciar a verificação. Tente de novo." };
  const { error: e2 } = await supabase.auth.mfa.verify({ factorId: factorId.data, challengeId: ch.id, code: code.data });
  if (e2) return { ok: false, message: "Código incorreto ou expirado. Confira o relógio do celular e tente o código atual." };

  redirect(safeRedirectPath(fd.get("next"), "/admin"));
}
