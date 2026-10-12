import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-[family-name:var(--font-display)] text-7xl font-extrabold text-[var(--action)]">404</p>
      <h1 className="mt-4 text-3xl font-bold">Esta página não existe</h1>
      <p className="mt-3 text-[var(--muted)]">O endereço pode ter mudado ou ter sido digitado com algum erro.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-[var(--radius-control)] bg-[var(--action)] px-5 py-3 font-bold text-[var(--action-text)]">Ir para o início</Link>
        <Link href="/busca" className="rounded-[var(--radius-control)] border-[1.5px] border-[var(--line)] px-5 py-3 font-bold">Buscar</Link>
      </div>
    </div>
  );
}
