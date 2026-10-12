/**
 * Renderização dos documentos para leitura, pré-visualização e impressão.
 * Componente puro (sem estado): usado no editor e na página de impressão.
 */
import { generateWordSearch } from "@/lib/wordsearch";
import { generateCrossword } from "@/lib/crossword";
import { checarCodigoBncc } from "@/lib/bncc";
import {
  LETRAS,
  gabarito,
  gerarVersao,
  ordemDireita,
  totalPontos,
  type Atividade,
  type Avaliacao,
  type Plano,
  type Questao,
} from "@/lib/documentos";

const PERIODICIDADE = { aula: "Plano de aula", semanal: "Plano semanal", mensal: "Plano mensal", sequencia: "Sequência didática" };
const ETAPA = { EI: "Educação Infantil", EF: "Ensino Fundamental", EM: "Ensino Médio", "": "" };

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  if (!texto.trim()) return null;
  return (
    <section className="doc-section">
      <h3>{titulo}</h3>
      <p className="whitespace-pre-line">{texto}</p>
    </section>
  );
}

export function PlanoView({ titulo, p }: { titulo: string; p: Plano }) {
  const ident = [
    PERIODICIDADE[p.periodicidade],
    p.etapa && ETAPA[p.etapa],
    p.ano && p.etapa === "EF" ? `${p.ano}º ano` : p.ano && p.etapa === "EM" ? `${p.ano}ª série` : null,
    p.componente,
    p.duracao,
  ].filter(Boolean);
  return (
    <article className="doc">
      <header className="doc-header">
        <h2>{titulo}</h2>
        {ident.length > 0 && <p>{ident.join(" · ")}</p>}
        {p.tema && <p><strong>Tema:</strong> {p.tema}</p>}
        {p.metodologia && <p><strong>Metodologia:</strong> {p.metodologia}</p>}
      </header>
      <Bloco titulo="Objetivos de aprendizagem" texto={p.objetivos} />
      {p.habilidades.length > 0 && (
        <section className="doc-section">
          <h3>Habilidades da BNCC</h3>
          <ul>
            {p.habilidades.map((h, i) => {
              const ok = checarCodigoBncc(h.codigo).ok;
              return (
                <li key={i}>
                  <strong>({h.codigo.toUpperCase()})</strong> {h.descricao}
                  {!ok && <em className="doc-alerta"> — código com formato inválido</em>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <Bloco titulo="Conhecimentos prévios" texto={p.conhecimentosPrevios} />
      <Bloco titulo="Materiais necessários" texto={p.materiais} />
      {p.desenvolvimento.length > 0 && (
        <section className="doc-section">
          <h3>Desenvolvimento</h3>
          <ol>
            {p.desenvolvimento.map((e) => (
              <li key={e.id}>
                <strong>{e.titulo || "Etapa"}</strong>
                {e.duracao && ` (${e.duracao})`}
                {e.descricao && <p className="whitespace-pre-line">{e.descricao}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
      <Bloco titulo="Estratégias de mediação" texto={p.mediacao} />
      <Bloco titulo="Atividades propostas" texto={p.atividades} />
      <Bloco titulo="Avaliação da aprendizagem" texto={p.avaliacao} />
      <Bloco titulo="Critérios de acompanhamento" texto={p.acompanhamento} />
      <Bloco titulo="Possíveis intervenções pedagógicas" texto={p.intervencoes} />
      <Bloco titulo="Contexto da turma" texto={p.contextoTurma} />
      <Bloco titulo="Acessibilidade" texto={p.acessibilidade} />
      <Bloco titulo="Referências" texto={p.referencias} />
      <p className="doc-nota">
        Habilidades da BNCC informadas pelo(a) professor(a). Confira as diretrizes curriculares da sua rede de ensino.
      </p>
    </article>
  );
}

/* ── Questões ─────────────────────────────────────────────────────── */

export function QuestoesView({ questoes, salt, mostrarPontos, linhasResposta = true }: { questoes: Questao[]; salt: string; mostrarPontos: boolean; linhasResposta?: boolean }) {
  return (
    <ol className="doc-questoes">
      {questoes.map((q, i) => (
        <li key={q.id} className="doc-questao">
          <p className="whitespace-pre-line">
            <strong>{i + 1}.</strong> {q.enunciado || <em>(enunciado vazio)</em>}
            {mostrarPontos && <span className="doc-pontos"> ({q.pontos.toLocaleString("pt-BR")} {q.pontos === 1 ? "ponto" : "pontos"})</span>}
          </p>
          {q.tipo === "multipla" && (
            <ol className="doc-alternativas" type="a">
              {q.alternativas.map((a) => <li key={a.id}>{a.texto}</li>)}
            </ol>
          )}
          {q.tipo === "vf" && (
            <ul className="doc-vf">
              {q.itens.map((it) => <li key={it.id}>( &nbsp;&nbsp; ) {it.texto}</li>)}
            </ul>
          )}
          {q.tipo === "associacao" && (
            <div className="doc-assoc">
              <ol>{q.pares.map((p) => <li key={p.id}>{p.esquerda}</li>)}</ol>
              <ol type="a">
                {ordemDireita(q, salt).map((idx) => <li key={q.pares[idx].id}>( &nbsp;&nbsp; ) {q.pares[idx].direita}</li>)}
              </ol>
            </div>
          )}
          {q.tipo === "discursiva" && linhasResposta && (
            <div className="doc-linhas" aria-hidden="true">
              {Array.from({ length: q.linhas }, (_, k) => <span key={k} />)}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function GabaritoView({ questoes, salt, titulo }: { questoes: Questao[]; salt: string; titulo: string }) {
  const g = gabarito(questoes, salt);
  return (
    <section className="doc doc-gabarito">
      <h2>{titulo}</h2>
      <table>
        <thead><tr><th>Questão</th><th>Resposta</th><th>Pontos</th></tr></thead>
        <tbody>
          {g.map((r) => <tr key={r.numero}><td>{r.numero}</td><td>{r.resposta}</td><td>{r.pontos.toLocaleString("pt-BR")}</td></tr>)}
        </tbody>
      </table>
      {questoes.some((q) => q.comentario.trim() || (q.tipo === "discursiva" && q.criterios.trim())) && (
        <>
          <h3>Resolução comentada e critérios</h3>
          <ol>
            {questoes.map((q, i) => {
              const crit = q.tipo === "discursiva" ? q.criterios : "";
              if (!q.comentario.trim() && !crit.trim()) return null;
              return (
                <li key={q.id} value={i + 1}>
                  {crit && <p className="whitespace-pre-line"><strong>Critérios:</strong> {crit}</p>}
                  {q.comentario && <p className="whitespace-pre-line">{q.comentario}</p>}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}

/* ── Atividade ────────────────────────────────────────────────────── */

export function AtividadeView({ titulo, a, docId, versao, comGabarito }: { titulo: string; a: Atividade; docId: string; versao: number; comGabarito: boolean }) {
  const salt = `${docId}:${versao}`;
  const sub = [a.componente, a.ano].filter(Boolean).join(" · ");
  return (
    <>
      <article className="doc">
        <header className="doc-header">
          <h2>{titulo}{versao > 0 ? ` — versão ${LETRAS[versao]}` : ""}</h2>
          {sub && <p>{sub}</p>}
          <div className="doc-identificacao"><span>Nome:</span><span>Data:</span></div>
        </header>
        {a.instrucoes && <p className="doc-instrucoes whitespace-pre-line">{a.instrucoes}</p>}

        {a.formato === "questoes" && (
          <QuestoesView questoes={gerarVersao(a.questoes, docId, versao, true)} salt={salt} mostrarPontos={false} />
        )}
        {a.formato === "caca-palavras" && <CacaPalavrasView a={a} seed={a.semente + versao} comRespostas={false} />}
        {a.formato === "cruzadinha" && <CruzadinhaView a={a} comRespostas={false} />}
      </article>

      {comGabarito && (
        <div className="doc-quebra">
          {a.formato === "questoes" && <GabaritoView questoes={gerarVersao(a.questoes, docId, versao, true)} salt={salt} titulo={`Gabarito — ${titulo}${versao > 0 ? ` (versão ${LETRAS[versao]})` : ""}`} />}
          {a.formato === "caca-palavras" && (
            <section className="doc"><h2>Gabarito — {titulo}</h2><CacaPalavrasView a={a} seed={a.semente + versao} comRespostas /></section>
          )}
          {a.formato === "cruzadinha" && (
            <section className="doc"><h2>Gabarito — {titulo}</h2><CruzadinhaView a={a} comRespostas /></section>
          )}
        </div>
      )}
    </>
  );
}

export function CacaPalavrasView({ a, seed, comRespostas }: { a: Atividade; seed: number; comRespostas: boolean }) {
  const ws = generateWordSearch(a.palavras, { size: a.tamanhoGrade, directions: a.direcoes, seed });
  const marcadas = new Set<string>();
  if (comRespostas) for (const p of ws.placed) for (let i = 0; i < p.word.length; i++) marcadas.add(`${p.row + p.dr * i},${p.col + p.dc * i}`);
  return (
    <div>
      <table className="doc-grade" aria-label="Caça-palavras">
        <tbody>
          {ws.grid.map((row, r) => (
            <tr key={r}>
              {row.map((ch, c) => <td key={c} className={marcadas.has(`${r},${c}`) ? "doc-marcada" : undefined}>{ch}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="doc-palavras"><strong>Palavras:</strong> {ws.placed.map((p) => p.display).sort((x, y) => x.localeCompare(y, "pt-BR")).join(" · ")}</p>
      {ws.skipped.length > 0 && <p className="doc-alerta">Não couberam na grade: {ws.skipped.join(", ")}. Aumente a grade ou reduza as palavras.</p>}
    </div>
  );
}

export function CruzadinhaView({ a, comRespostas }: { a: Atividade; comRespostas: boolean }) {
  const cw = generateCrossword(a.pistas.map((p) => ({ answer: p.resposta, clue: p.pista })));
  if (cw.entries.length === 0) return <p className="doc-alerta">Adicione respostas com pistas para montar a cruzadinha.</p>;
  const numeros = new Map(cw.entries.map((e) => [`${e.row},${e.col}`, e.number]));
  return (
    <div>
      <table className="doc-cruz" aria-label="Cruzadinha">
        <tbody>
          {cw.cells.map((row, r) => (
            <tr key={r}>
              {row.map((ch, c) =>
                ch ? (
                  <td key={c} className="doc-cruz-cel">
                    {numeros.has(`${r},${c}`) && <span className="doc-cruz-num">{numeros.get(`${r},${c}`)}</span>}
                    {comRespostas ? ch : ""}
                  </td>
                ) : (
                  <td key={c} className="doc-cruz-vazia" />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-pistas">
        <div>
          <h3>Horizontais</h3>
          <ul>{cw.entries.filter((e) => e.across).map((e) => <li key={`h${e.number}`}><strong>{e.number}.</strong> {e.clue}</li>)}</ul>
        </div>
        <div>
          <h3>Verticais</h3>
          <ul>{cw.entries.filter((e) => !e.across).map((e) => <li key={`v${e.number}`}><strong>{e.number}.</strong> {e.clue}</li>)}</ul>
        </div>
      </div>
      {cw.skipped.length > 0 && <p className="doc-alerta">Sem cruzamento possível: {cw.skipped.map((s) => s.answer).join(", ")}.</p>}
    </div>
  );
}

/* ── Avaliação ────────────────────────────────────────────────────── */

export function AvaliacaoView({ titulo, a, docId, versao }: { titulo: string; a: Avaliacao; docId: string; versao: number }) {
  const qs = gerarVersao(a.questoes, docId, versao, a.embaralharAlternativas);
  const total = totalPontos(a.questoes);
  return (
    <article className={`doc doc-prova fonte-${a.layout.fonte} tam-${a.layout.tamanho} esp-${a.layout.espacamento} ${a.layout.economica ? "economica" : ""}`}>
      <header className="doc-cabecalho">
        {a.escola && <p className="doc-escola">{a.escola}</p>}
        <h2>{titulo}{a.versoes > 1 ? ` — versão ${LETRAS[versao]}` : ""}</h2>
        <p>{[a.componente, a.turma, a.periodo].filter(Boolean).join(" · ")}</p>
        <div className="doc-identificacao">
          <span>Estudante:</span>
          <span>Data: {a.data}</span>
          {a.professor && <span>Professor(a): {a.professor}</span>}
          <span>Nota: ____ / {total.toLocaleString("pt-BR")}</span>
        </div>
      </header>
      {a.instrucoes && <p className="doc-instrucoes whitespace-pre-line">{a.instrucoes}</p>}
      <QuestoesView questoes={qs} salt={`${docId}:${versao}`} mostrarPontos />
    </article>
  );
}
