// Gera capturas das páginas públicas (usado pelo workflow "Capturas de tela").
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const PAGINAS = ["/", "/biblioteca", "/formacao", "/inclusao", "/planos", "/instituicao", "/planejamento", "/editais", "/suporte", "/cadastro"];
mkdirSync("capturas", { recursive: true });

const browser = await chromium.launch();
for (const [nome, opts] of [
  ["desktop", { viewport: { width: 1366, height: 900 } }],
  ["celular", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
]) {
  for (const tema of ["light", "dark"]) {
    if (nome === "celular" && tema === "dark") continue;
    const ctx = await browser.newContext({ ...opts, colorScheme: tema, locale: "pt-BR" });
    const page = await ctx.newPage();
    for (const p of tema === "dark" ? ["/", "/planos"] : PAGINAS) {
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const slug = p === "/" ? "inicio" : p.slice(1).replace(/\//g, "-");
      await page.screenshot({ path: `capturas/${nome}-${tema}-${slug}.jpg`, fullPage: true, type: "jpeg", quality: 82 });
      console.log("ok", nome, tema, p);
    }
    await ctx.close();
  }
}
await browser.close();
