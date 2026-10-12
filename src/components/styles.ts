// Classes compartilhadas entre componentes de servidor e de cliente.
// Ficam fora de módulos "use client" para chegarem como texto ao servidor.

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)] transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] bg-[var(--surface)] px-5 py-3 font-bold text-[var(--text)] transition-colors hover:border-[var(--muted)] disabled:opacity-60";

/** Script executado antes da pintura para evitar piscar o tema errado. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
