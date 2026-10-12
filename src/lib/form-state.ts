/** Estado devolvido pelas Server Actions aos formulários. */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

export const TERMS_VERSION = "2026-10";
