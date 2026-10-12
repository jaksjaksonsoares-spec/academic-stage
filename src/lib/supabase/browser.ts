"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente do navegador: usado só para enviar o PDF do edital direto ao armazenamento privado. */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
