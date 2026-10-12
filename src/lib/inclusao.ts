/**
 * Modelos editáveis do núcleo de inclusão. Pensados para registrar barreiras
 * observadas e apoios — nunca diagnósticos, laudos ou identificação de estudantes.
 */
export const AVISO_DADOS =
  "Não registre nome completo, diagnóstico, laudo ou outros dados sensíveis neste documento. Use um código interno da escola. Documentos oficiais do estudante seguem os protocolos da sua rede.";

export const MODELOS_INCLUSAO = {
  pei: {
    titulo: "Plano educacional individualizado (modelo)",
    descricao: "Organiza objetivos, barreiras, apoios e acompanhamento ao longo do período.",
    corpo: `PLANO EDUCACIONAL INDIVIDUALIZADO

${AVISO_DADOS}

1. Identificação
Código do estudante na escola:
Ano/turma:
Período deste plano:
Profissionais envolvidos (funções):

2. Potencialidades e interesses
O que o estudante já faz com autonomia, do que gosta, como prefere aprender:

3. Barreiras observadas
Em quais atividades e situações a participação ou a aprendizagem ficam limitadas? (Descreva a situação, não a pessoa.)

4. Objetivos de aprendizagem para o período
Objetivo 1:
Como saberemos que foi alcançado:
Objetivo 2:
Como saberemos que foi alcançado:

5. Estratégias, recursos e adaptações
Apresentação do conteúdo (formatos, apoios visuais, leitura em voz alta…):
Formas de resposta aceitas (oral, desenho, escolha entre opções, digitação…):
Organização do tempo e do espaço:
Recursos de acessibilidade e tecnologia assistiva:

6. Avaliação
Adaptações nas avaliações (tempo, formato, leitura, quantidade de itens):

7. Articulação
Atendimento educacional especializado (AEE), família e outros profissionais — o que foi combinado:

8. Acompanhamento
Data | Observação | Próximo passo

9. Revisão do plano
Data prevista:
`,
  },
  rotina: {
    titulo: "Rotina visual da turma (modelo)",
    descricao: "Sequência do dia em passos curtos, para imprimir e combinar com imagens.",
    corpo: `ROTINA DO DIA

Use frases curtas e uma imagem para cada passo. Mostre a rotina no começo do dia e retome a cada mudança de atividade.

1. Chegada e acolhida
2. Roda de conversa
3. Atividade principal
4. Lanche
5. Atividade em grupo
6. Organização dos materiais
7. Saída

Mudanças do dia (avise com antecedência):
`,
  },
  acompanhamento: {
    titulo: "Registro de acompanhamento pedagógico (modelo)",
    descricao: "Registro objetivo de evidências de aprendizagem e participação.",
    corpo: `REGISTRO DE ACOMPANHAMENTO

${AVISO_DADOS}

Código do estudante:
Objetivo acompanhado:

Data | Atividade | O que foi observado (fato, não interpretação) | Apoio oferecido | Resultado
-
-
-

Síntese do período:
Ajustes para o próximo período:
`,
  },
  adaptacao: {
    titulo: "Roteiro para adaptar uma atividade (modelo)",
    descricao: "Perguntas para adaptar sem empobrecer o objetivo de aprendizagem.",
    corpo: `ROTEIRO DE ADAPTAÇÃO DE ATIVIDADE

Atividade original:
Objetivo de aprendizagem (o que NÃO muda):

1. Qual barreira a atividade cria? (leitura, escrita, tempo, atenção, comunicação, mobilidade, visão, audição…)
2. Como apresentar o conteúdo de outra forma? (imagem, áudio, material concreto, exemplo resolvido)
3. Como o estudante pode responder? (oral, desenho, apontar, digitar, escolher entre opções)
4. As instruções podem ser divididas em passos menores e numerados?
5. É preciso mais tempo, menos itens com o mesmo objetivo ou pausas?
6. Que apoio da turma ou de colegas favorece a participação?

Versão adaptada:
`,
  },
} as const;

export type ModeloInclusao = keyof typeof MODELOS_INCLUSAO;

/** Princípios do Desenho Universal para a Aprendizagem (DUA), em linguagem prática. */
export const ESTRATEGIAS = [
  {
    titulo: "Várias formas de apresentar",
    itens: ["Combine texto, imagem, áudio e material concreto.", "Destaque palavras-chave e use exemplos resolvidos.", "Ofereça o texto com fonte ampliada e bom contraste."],
  },
  {
    titulo: "Várias formas de responder",
    itens: ["Aceite resposta oral, desenho, escolha entre opções ou digitação.", "Divida tarefas longas em etapas com marcos de verificação.", "Ofereça modelos e listas de conferência."],
  },
  {
    titulo: "Várias formas de engajar",
    itens: ["Relacione o tema aos interesses da turma.", "Combine a rotina e antecipe mudanças.", "Use trabalho em pares e papéis definidos em grupo."],
  },
  {
    titulo: "Avaliação acessível",
    itens: ["Mantenha o objetivo; ajuste formato, tempo e quantidade de itens.", "Leia as questões em voz alta quando a leitura não for o que se avalia.", "Registre evidências ao longo do processo, não só na prova."],
  },
];

export const RECURSOS_ACESSIVEIS = [
  { nome: "VLibras", descricao: "Tradução de português para Libras, gratuita, do governo federal.", url: "https://www.gov.br/governodigital/pt-br/vlibras" },
  { nome: "NVDA", descricao: "Leitor de tela gratuito para Windows.", url: "https://www.nvaccess.org/" },
];
