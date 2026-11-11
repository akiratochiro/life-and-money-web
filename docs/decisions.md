# Decisões de arquitetura — front-end

Mesmo formato do [docs/decisions.md da API](https://github.com/akiratochiro/life-and-money-api/blob/main/docs/decisions.md):
contexto, decisão e consequências. Só entram aqui as escolhas que não são óbvias pelo código.

## 1. Os tipos da API são gerados, nunca escritos à mão

**Contexto.** O front precisa conhecer o formato de cada resposta da API. Escrever essas
interfaces à mão significa manter duas definições do mesmo contrato em repositórios diferentes.

**Decisão.** `npm run api:types` lê o OpenAPI que a API publica e gera
`src/shared/api/schema.d.ts`. O `openapi-fetch` usa esse arquivo para tipar caminho, parâmetros,
corpo e resposta de cada chamada. O arquivo gerado é commitado.

**Consequências.** O back-end é a fonte da verdade, e uma mudança incompatível aparece como erro
de compilação em vez de erro em produção: um campo renomeado na API quebra o `tsc`, não a tela.
A CI roda `npm run build`, que inclui o `tsc`, então a quebra aparece antes do merge.

O preço é um passo manual: quando um endpoint muda, é preciso rodar o `api:types` com a API no
ar e commitar o arquivo gerado junto. Um arquivo gerado no repositório também é estranho à
primeira vista, mas a alternativa — gerar no build — exigiria a API acessível durante o build
do front, inclusive na CI e no serviço de hospedagem.

## 2. O TanStack Query é o único dono do estado do servidor

**Contexto.** Quase tudo que a interface mostra vem da API: transações, orçamento, metas,
dashboards. Esse estado precisa de cache, invalidação depois de uma escrita, estados de
carregamento e de erro.

**Decisão.** Não existe store global. Cada feature expõe hooks (`useTransactions`,
`useBudgetDashboard`, `useGoals`) e as mutações invalidam as chaves afetadas. O `useState` só
guarda estado de interface: o mês selecionado, qual card está em edição, o valor de um campo.

**Consequências.** Nenhum dado do servidor é duplicado em dois lugares, então não existe a
classe de bug em que a tela mostra um valor e o servidor tem outro. Depois de criar uma
transação, o saldo, o orçamento e as metas se atualizam porque as chaves foram invalidadas, e
não porque alguma tela se lembrou de recarregar.

A contrapartida é que as chaves de cache passam a ser um contrato implícito entre features:
`transactionsApi` invalida `["dashboard"]`, `["goals"]` e `["transactions"]` porque uma
transação mexe nos três. Esquecer uma dessas chaves deixa uma tela desatualizada, e nada no
compilador avisa.

## 3. Dinheiro em centavos nos formulários

**Contexto.** A API troca valores decimais (`250.75`). Um `<input type="number">` com decimais
em português leva o usuário a brigar com vírgula, ponto e casas sobrando.

**Decisão.** Os campos de valor guardam centavos num inteiro. O `AmountInput` descarta tudo que
não é dígito, trata o número como centavos e formata com `Intl.NumberFormat`, então digitar
`25075` mostra `R$ 250,75`. A conversão para o formato da API acontece em um só lugar, na hora
de enviar: `cents / 100`. O `PercentInput` faz o mesmo com centésimos de ponto percentual.

**Consequências.** Não há arredondamento acidental enquanto o usuário digita, e o teclado
numérico do celular basta para preencher o campo. O valor que chega na API tem no máximo duas
casas decimais por construção, que é o que a validação do back-end exige.

O custo é que existem duas unidades no código. A regra é simples — centavos dentro do
formulário, reais na fronteira com a API — mas é uma regra que precisa ser lembrada.

## 4. O access token vive em memória, e a renovação é proativa

**Contexto.** O access token precisa acompanhar toda requisição. Guardá-lo no `localStorage` ou
no `sessionStorage` o deixa legível por qualquer script que consiga rodar na página.

**Decisão.** O token fica numa variável de módulo em `shared/auth/session.ts`. Quem devolve a
sessão depois de um recarregamento é o cookie `HttpOnly` do refresh token, que este código nunca
lê: o `SessionProvider` faz uma tentativa de renovação ao abrir o app. O middleware do cliente
pede o token antes de cada requisição e, se ele estiver a menos de 30 segundos do vencimento,
renova antes de enviar.

**Consequências.** Não existe token em storage para ser roubado, e a sessão não cai no meio do
uso. Recarregar a página perde o access token, por isso existe o estado `loading`: mandar para
o login antes da resposta da renovação expulsaria um usuário que está logado.

Renovar antes de vencer, em vez de reagir ao 401 e repetir a requisição, foi uma escolha de
simplicidade. Repetir a requisição original exigiria clonar o `Request` antes de enviá-lo,
porque depois do `fetch` o corpo já foi consumido, e o ganho não paga essa complexidade. O 401
continua tratado, mas como fim de sessão, não como retentativa.

As renovações concorrentes compartilham a mesma promessa. Sem isso, as consultas que a home
dispara ao abrir renovariam em paralelo e, como cada renovação rotaciona o refresh token, uma
invalidaria a outra — o usuário seria desconectado justamente por abrir o app.

## 5. As mensagens de erro vêm da API, não do front

**Contexto.** Cada regra de negócio que o usuário pode violar precisa de uma explicação na tela.

**Decisão.** A API responde em RFC 9457 (`ProblemDetail`) com o `detail` já em português,
escrito para o usuário. O `ApiError` carrega esse texto como `message`, e o front o mostra como
está. Para erros de validação, o mapa `errors` marca o campo no formulário.

**Consequências.** A regra e a explicação dela moram no mesmo lugar: quem muda a regra no
back-end muda a mensagem junto, sem depender de alguém lembrar de atualizar o front.

Onde o front sabe algo que a API não sabe, ele traduz o status para um texto mais específico —
é o caso do 409 ao criar categoria, que vira "Já existe uma categoria ativa com esse nome e esse
tipo." Isso vale enquanto cada endpoint tem um só motivo para aquele status; se um endpoint
passar a ter dois, o texto genérico volta a ser o certo.

## 6. Organização por feature

**Contexto.** Organizar por tipo de arquivo (`components/`, `hooks/`, `services/`) espalha uma
mesma tela por várias pastas.

**Decisão.** Cada feature é uma pasta com as telas, os componentes e o módulo de API dela
(`features/budget/BudgetPage.tsx`, `BudgetEditor.tsx`, `budgetApi.ts`). O que é realmente
compartilhado fica em `shared/` — cliente de API, sessão, componentes de UI, helpers de data e
dinheiro.

**Consequências.** Mexer no orçamento é mexer numa pasta. O limite entre feature e `shared/`
fica explícito: quando um segundo lugar precisa de algo, ele sobe para `shared/`, e essa subida
é uma decisão visível no diff.

Quando uma feature precisa do tipo de outra, ela importa do módulo de API dessa outra feature
(a home importa `BudgetLine` de `features/budget/budgetApi`). É uma dependência direta entre
features, assumida de propósito: criar um pacote intermediário só para o tipo seria mais
cerimônia do que benefício.

## 7. Testes com Vitest, Testing Library e jsdom

**Contexto.** As regras que vivem no front — a conversão de centavos, a ordem dos alertas de
orçamento — só eram conferidas à mão. Um erro de arredondamento ou uma ordem trocada passaria
pelo `tsc` sem aviso, porque os tipos continuam certos.

**Decisão.** Os testes rodam no Vitest, configurado no bloco `test` do próprio `vite.config.ts`.
Componentes são testados com a Testing Library num DOM simulado pelo jsdom, e a interação é feita
com o `user-event`, que digita tecla por tecla como o usuário. A CI roda `npm test` antes do build.

**Consequências.** O Vitest usa os mesmos plugins e a mesma resolução de módulos do app, então não
existe uma segunda configuração de build só para os testes — que é o que o Jest exigiria, com um
transformador de TypeScript e de JSX à parte. A Testing Library empurra os testes para o que o
usuário vê (`getByLabelText`, `getByRole`) em vez de detalhes de implementação, então um refactor
que não muda o comportamento não quebra o teste.

Os imports de `describe`, `it` e `expect` são explícitos, sem `globals: true`. Fica mais claro de
onde cada coisa vem, mas a Testing Library deixa de limpar o DOM sozinha entre um teste e outro,
por isso o `src/test/setup.ts` registra o `cleanup`.

O jsdom é rápido, mas não é um navegador: não calcula layout nem roda CSS. O que depende disso,
como o tamanho do anel de progresso na tela, continua fora dos testes. Ele também fixa a versão
mínima do Node (22.22 ou 24.15).

## 8. Front e API na mesma origem, com o Worker como proxy

**Contexto.** O front ficava em `*.workers.dev` e a API em `*.onrender.com`. Os dois sufixos estão
na Public Suffix List, então cada subdomínio é um site diferente e o cookie de refresh era de
terceiros. O Safari bloqueia cookies de terceiros por padrão — e no iPhone todo navegador usa o
mesmo motor dele. O login funcionava, mas a sessão caía a cada recarregamento.

**Decisão.** O Worker que serve o front também repassa `/api/*` para a API, e o front chama a API
pelo caminho relativo `/api`. A API passou a responder sob `/api` (context-path), para o Worker
não precisar reescrever o caminho. No desenvolvimento, o proxy do Vite faz o mesmo papel.

**Consequências.** Para o navegador existe uma origem só, então o cookie é primário e pode ser
`SameSite=Strict`, a API deixou de precisar de CORS e o `VITE_API_URL` deixou de existir — e com
ele a armadilha de publicar um build apontando para o localhost.

O prefixo `/api` na própria API, em vez de o Worker remover o prefixo, é o que faz o cookie
funcionar: o `Path` do cookie é comparado com o caminho que o navegador vê. Se o Worker
transformasse `/api/auth/refresh` em `/auth/refresh`, a API emitiria `Path=/auth` e o navegador
nunca o enviaria de volta, a menos que o Worker reescrevesse também o `Set-Cookie`.

O custo é um salto a mais: cada chamada passa pela Cloudflare antes de chegar ao Render, e cada
uma conta no limite de 100.000 requisições por dia do plano gratuito do Workers. Os estáticos
continuam fora dessa conta, porque só `/api/*` executa o script (`run_worker_first`).

## 9. Esperar a API acordar em vez de mostrar erro

**Contexto.** A API roda no plano gratuito do Render, que hiberna depois de um tempo sem
requisições. A primeira chamada depois disso leva de 30 a 60 segundos, ou volta 502/503 do proxy
enquanto a API sobe. Com `retry: 1` nas queries, isso aparecia como "não foi possível carregar seus
dados" — e a renovação da sessão, ao receber o 502, mandava o usuário para o login.

**Decisão.** Ao abrir o app, `serverWake` bate no `/health`. Se a resposta não vier em cerca de
2 segundos, um aviso "Acordando o servidor…" cobre o app até a API responder; depois de um minuto
e meio sem resposta, o aviso oferece tentar de novo. A renovação da sessão só sai depois que o
servidor responde.

Para quando a API hiberna com o app aberto, as queries repetem só erros transitórios (rede,
timeout, 502/503/504), com backoff de 1 s a 10 s, e as leituras têm timeout de 20 s. O Worker passou
a responder 502 quando não consegue falar com a API, em vez de um erro genérico da Cloudflare.

**Consequências.** O aviso só aparece quando a API está de fato dormindo: uma resposta em menos de
2 segundos passa sem nada na tela.

A parte delicada é o que **não** é repetido. Escritas não têm timeout nem retry: um POST abortado
no meio pode já ter sido gravado, e repeti-lo duplicaria um lançamento. A renovação da sessão só
repete 502/503, que é o proxy dizendo que o pedido não chegou à API; um 500 ou 504 pode ter vindo
depois de a API rotacionar o refresh token, e reenviar o token antigo seria tratado como roubo de
sessão, revogando todas as sessões do usuário.

O aviso cobre só a abertura do app. Se a API hibernar com o app aberto, quem segura a espera é o
retry das queries, sem aviso na tela: o usuário vê os dados que já estavam em cache, ou o
carregamento, por mais tempo.

## 10. O token de redefinição de senha não fica na URL

**Contexto.** O link do e-mail de "esqueci minha senha" leva o token na query string
(`/reset-password?token=...`). Enquanto ele estiver na URL, fica no histórico do navegador, num
print da tela, num link copiado e no cabeçalho `Referer` de qualquer requisição que a página fizer.

**Decisão.** A `ResetPasswordPage` lê o token uma vez, para o estado do React, e logo em seguida
navega para `/reset-password` com `replace`, sem a query. O `index.html` declara
`<meta name="referrer" content="no-referrer">` para o app inteiro.

**Consequências.** Depois do primeiro render, o token só existe na memória da aba, até ser enviado
no corpo do `POST`. O meta vale para o app todo, e não só para essa tela, porque precisa estar no
documento antes de qualquer requisição sair; como o front e a API estão na mesma origem, o
`Referer` não tinha uso no app.

Recarregar a página depois disso perde o token, e a tela pede para abrir o link do e-mail de novo.
É o preço de não deixar o token na URL, e o link continua valendo até ser usado ou expirar.


## 11. O calendário de contas é CSS grid, e as datas nunca passam por UTC

**Contexto.** A tela Contas precisa de um calendário mensal com marcadores por status em cada
dia. Bibliotecas de calendário resolvem isso, mas trazem um componente inteiro (seleção de
intervalo, localização, estilos próprios) para uma grade de sete colunas, e uma dependência a mais
para manter.

**Decisão.** O calendário é um `grid-cols-7` do Tailwind. O dia 1 recebe `grid-column-start`
igual ao dia da semana dele, então não existem casas vazias no HTML. A grade sai de uma função pura
(`monthGrid`) que só usa o construtor local `new Date(ano, mês, dia)`. As datas da API trafegam
como texto `AAAA-MM-DD`.

O status de cada dia aparece com forma própria além da cor: ponto cheio (atrasada), anel
(pendente) e visto (paga). Cada dia é um botão com um rótulo para leitor de tela, como "10 de
novembro: 1 atrasada, 1 paga".

**Consequências.** Nenhuma dependência nova, e o calendário tem exatamente o comportamento
desta tela: tocar num dia filtra a lista, e tocar de novo limpa o filtro.

O cuidado com o fuso é o ponto delicado. `new Date("2026-02-28")` é lido como meia-noite em UTC e,
no Brasil (UTC−3), vira o dia 27 às 21h: uma conta do dia 28 apareceria no dia 27. O construtor
local não tem esse problema, e os testes da grade passam de UTC−10 a UTC+14. Quem decide o dia de
vencimento, inclusive o dia 31 em fevereiro, é a API; o front só posiciona a data que recebe.

Em troca, coisas que uma biblioteca daria de graça ficam por fazer, como navegar pelo teclado com
as setas entre os dias. Hoje se navega com Tab, dia a dia.

## 12. As contas também são invalidadas por transações e categorias

**Contexto.** Pagar uma conta cria uma transação, e excluir essa transação pelo extrato desfaz o
pagamento (decisão 10 da API). Arquivar uma categoria encerra as contas dela.

**Decisão.** Pagar e desfazer invalidam `["bills"]`, `["transactions"]` e `["dashboard"]`. As
mutações de transação passam a invalidar também `["bills"]`, e as de categoria também.

**Consequências.** O contrato implícito das chaves de cache (decisão 2) cresceu: uma tela de
contas desatualizada depois de excluir uma transação no extrato é exatamente o tipo de erro que o
compilador não pega. Por isso a regra ficou escrita no comentário de cada módulo de API, e não só
aqui.

## 13. Feriados no calendário: destaque do dia, não uma conta, e o prazo vem da API

**Contexto.** O calendário de contas precisava mostrar os feriados nacionais, e uma conta que vence
num fim de semana ou feriado pode ser paga no próximo dia útil sem atraso (decisão 11 da API).

**Decisão.** O dia de feriado pinta o quadrado inteiro (fundo azulado e uma estrela no canto), em
vez de ganhar um marcador como os das contas, e o rótulo para leitor de tela inclui o nome do
feriado. Os feriados vêm de `GET /holidays`, da própria API, que os busca na BrasilAPI. O prazo de
cada ocorrência (`payableUntil`) também vem pronto da API: quando ele não é o próprio vencimento,
a conta mostra "vence sáb 14 → pague até seg 16".

**Consequências.** O front não calcula dia útil: se calculasse, haveria duas regras para a mesma
pergunta ("está atrasada?"), e as duas poderiam discordar. Ele só posiciona o feriado no
calendário e mostra o prazo que recebeu.

A consulta de feriados fica em cache para sempre (`staleTime: Infinity`) quando a resposta veio
completa, porque os feriados de um ano não mudam. Quando a BrasilAPI estava fora do ar
(`available: false`), a resposta vale só um minuto, para a tela tentar de novo sozinha.

A BrasilAPI só cobre feriados nacionais. Um aviso fixo embaixo do calendário diz isso, para quem
tem feriado estadual ou municipal não achar que ele foi esquecido, nem contar com ele para adiar o
prazo. Sem a BrasilAPI, o aviso muda e diz que os prazos consideram só os fins de semana.

## 14. O cache é apagado quando a sessão termina

**Contexto.** Um print das Análises mostrou R$ 600 em Moradia em outubro, enquanto a Início e o
Extrato mostravam zero no mesmo mês. As três telas somam as mesmas transações no servidor, pelo
mesmo filtro de data, e as datas trafegam como `AAAA-MM-DD`, sem passar por UTC; toda mutação de
transação já invalidava `["dashboard"]`. Sobrou o cache: só o "Sair" chamava `queryClient.clear()`,
e as chaves do TanStack Query não dizem de quem são os dados.

**Decisão.** O `SessionProvider` apaga o cache sempre que a sessão termina, por qualquer motivo
(logout, refresh recusado, 401). O login e o cadastro também apagam, porque entrar com outra conta
sem ter saído não encerra a sessão anterior. A renovação do token não apaga.

**Consequências.** Uma conta nunca vê, nem por um instante, os dados da conta anterior na mesma
aba. Antes, com a API acordando, isso podia durar quase um minuto, e explicaria o print: as
Análises vindas do cache, o Extrato buscado do zero. Não dá para provar que foi isso sem o momento
do print, mas era um defeito real de qualquer forma. O custo é que voltar a entrar refaz todas as
buscas, o que já acontece ao recarregar a página.

## 15. Atualização otimista com foto do cache, e o que cada mutação recarrega num mapa só

**Contexto.** Criar, editar e apagar uma transação, aportar numa meta e arquivar uma categoria
esperavam o servidor para mudar a tela; com a API no plano gratuito, isso às vezes leva segundos.
As listas de chaves a invalidar estavam espalhadas pelos módulos de API.

**Decisão.** Essas mutações mudam o cache antes da resposta. Antes de mexer, cancelam as buscas em
andamento (uma resposta antiga chegando depois apagaria a mudança) e guardam uma foto das listas
afetadas. Se o servidor recusar, a foto volta e um toast diz o motivo que a API deu. A regra de
ordenação do extrato e o ajuste do valor guardado na meta são funções puras
(`transactions/optimistic.ts`), testadas sem React. Depois da resposta, o que recarregar sai de um
mapa único, `shared/api/invalidation.ts`, com um teste por linha.

**Consequências.** A nova transação volta para a tela anterior na hora, e o diálogo de edição
fecha na hora. O preço é que um erro do servidor aparece depois que o formulário já fechou: o toast
explica, mas quem digitou precisa digitar de novo. Os erros que o servidor pode dar ali são raros
(categoria arquivada no meio do caminho, por exemplo), porque o formulário já valida o resto.

O front só calcula o que é simples e não é regra de negócio: a posição na lista e o valor guardado.
O valor por mês de uma meta e os totais do dashboard esperam o servidor, porque são cálculos dele.

A revisão das invalidações não encontrou nenhuma esquecida, só uma chave morta (`["budgets"]`).
Concentrá-las não muda o comportamento, mas transforma o contrato implícito da decisão 2 num lugar
só, verificado por teste.

## 16. Motion com LazyMotion, e animação só no que chega depois

**Contexto.** As transições de página e a entrada de itens deviam ser curtas, respeitar
`prefers-reduced-motion` e não pesar no bundle.

**Decisão.** Motion com `LazyMotion strict`: o bundle inicial leva só o componente `m`, e as
animações (`domAnimation`) chegam num pedaço carregado sob demanda. O `MotionConfig` segue o
`prefers-reduced-motion`, e as durações ficam entre 150 e 250 ms. A página anima ao navegar, não na
primeira abertura, e as listas usam `AnimatePresence initial={false}`: o primeiro lote aparece
direto, e o que entra ou sai depois (uma transação otimista, um toast) anima.

**Consequências.** Medido no build, em gzip: o bundle principal foi de 138,3 kB para 154,2 kB
(+15,9 kB), mais 17,9 kB sob demanda. Sem o LazyMotion, seriam +45,5 kB no bundle principal.

Animar a primeira aparição do conteúdo atrasaria o LCP, porque o Chrome só conta o elemento quando
ele fica visível. Mesmo assim, o peso extra aparece no Lighthouse: o FCP subiu cerca de 230 ms no
perfil móvel simulado, em todas as telas, inclusive no login, que não anima nada, porque o app é
um bundle só. Separar o código por rota recuperaria isso e mais.

A contagem do saldo não usa a Motion: são 30 linhas com `requestAnimationFrame`, para não trazer o
`animate()` ao bundle principal por um único uso.

## 17. Prefetch dos meses vizinhos e skeletons no formato real

**Contexto.** Trocar de mês no Extrato, nas Análises, nas Contas e no Orçamento mostrava um
carregamento a cada clique, e os blocos genéricos de carregamento tinham outra altura que o
conteúdo, então a tela pulava (CLS de 0,109 nas Análises).

**Decisão.** Ao abrir um mês, o anterior e o próximo são buscados em segundo plano
(`usePrefetchAdjacentMonths`). As queries viraram fábricas com `queryOptions`, usadas pelo hook e
pelo prefetch, para a chave e a busca serem as mesmas. Cada tela ganhou um skeleton com a mesma
estrutura do componente real, e o pulso respeita o movimento reduzido. Os botões que enviam algo
mantêm a largura: o texto fica invisível e o spinner aparece por cima (`PendingLabel`).

**Consequências.** A troca de mês aparece sem carregamento na maior parte das vezes. O
`prefetchQuery` respeita o `staleTime`, então ir e voltar não multiplica as chamadas, mas cada mês
novo custa duas requisições a mais, que contam no limite de 100.000 por dia do Workers. O CLS das
Análises caiu de 0,109 para 0,034, e o da Início de 0,038 para 0,021.

## 18. "Cofrinho de argila": claymorphism pastel, com tokens semânticos e contraste testado

**Contexto.** A direção "Tinta e Sinal" (azul-tinta e laranja neon) dava ao app uma cara de painel
técnico, e o logo era só texto. A identidade nova devia ter o porco como símbolo, cores pastel e o
visual de argila (claymorphism).

**Decisão.** Um tema claro, em que o volume vem da sombra: cada card tem uma sombra externa macia
tingida de rosa, um brilho interno no topo e uma sombra interna na base, e o botão primário afunda
quando é pressionado. Os tokens no `@theme` passaram a ter nomes de papel, não de tom:

- fundos (`canvas`, `surface`, `sunken`), texto em três intensidades com o marrom do porco
  (`#493b30`), e `link`;
- os rosas do porco como marca (`pig-*`), para logo e decoração, nunca para texto pequeno: o
  `#a5627a` da paleta fica abaixo de 4,5:1 sobre o fundo;
- um único destaque, a framboesa (`accent`, `#b8395f`), reservado a ações primárias e pontos de
  atenção (o item ativo do menu, o dia de hoje). Controles segmentados e chips selecionados usam
  argila neutra;
- entrou, saiu, guardou e alerta em três papéis cada: preenchimento (barras, pontos), fundo suave
  (selos) e um tom forte, o único seguro para texto;
- raios, sombras, espaçamento (`gutter`, `card`, `section`) e uma escala tipográfica com nome
  (`display`, `title`, `heading`, `label`). Títulos em Fredoka, arredondada.

**Consequências.** Trocar o tema inteiro foi, em boa parte, trocar os tokens: os componentes já
usavam nomes como `bg-surface` e `text-text-muted`. O que não era semântico (`ink-900`, `signal`,
cores fixas como `text-[#1a0710]`) foi migrado por script e revisado à mão onde o papel dependia
do contexto.

Num tema claro, uma cor de gráfico raramente serve como texto, e por isso o tom forte separado. O
`src/theme.test.ts` relê o `index.css` e confere o contraste AA de todo par de texto e fundo,
inclusive a tinta de cada cor de categoria; a lista de cores vem do mesmo `categoryLook` que o app
usa, que o tipo gerado da API obriga a estar completo. Uma cor nova da API sem token, ou um ajuste
de tom que derrube a legibilidade, quebra o teste.

O app deixou de ter tema escuro. Os tokens com nome de papel deixam um tema escuro possível depois,
redefinindo os valores num `@media (prefers-color-scheme: dark)`.

## 19. O porco, a moeda e as formas flutuantes

**Contexto.** O porco devia fazer parte da identidade, junto com uma moeda, e o app ganharia formas
flutuantes discretas.

**Decisão.** O rosto do porco, o porco inteiro (EmojiOne) e a moeda (Twemoji) viraram componentes
com o SVG embutido, sem requisição extra. Os dois conjuntos são CC BY 4.0: os desenhos não foram
alterados, e o crédito está em "Minha conta" e no README, como a licença pede. O logo junta o rosto
do porco num ladrilho de argila com o nome em Fredoka.

As formas flutuantes (moedas, porcos e manchas de argila) aparecem só no login e nos estados vazios,
que viraram um componente único, `EmptyState`. Elas ficam em baixa opacidade, animam só com
`transform`, param com `prefers-reduced-motion` e são invisíveis para leitor de tela e para o mouse.

**Consequências.** Nunca ficam atrás de números: um valor com algo se mexendo por trás é mais
difícil de ler. `transform` é composto pela GPU, sem refazer layout nem pintura a cada quadro. O
custo das ilustrações é o tamanho dos SVGs no bundle, cerca de 7 kB antes da compressão, menos do
que três requisições de imagem.

## 20. Microinterações que só comemoram o que o servidor confirmou

**Contexto.** Salvar uma transação e atingir uma meta mereciam um retorno visual, mas a transação é
otimista (decisão 15): a tela muda antes de o servidor responder.

**Decisão.** O check animado de "Transação salva." e o confete de meta atingida saem no `onSuccess`,
não no `onMutate`. A meta concluída é detectada na própria atualização otimista (o status passou de
em andamento para concluída) e só é celebrada quando o servidor aceita. O confete são 36 peças em
CSS, só `transform` e `opacity`, que somem em 1,6 s, sem biblioteca.

**Consequências.** A comemoração nunca precisa ser desfeita: se o servidor recusar, a tela volta,
aparece o erro, e não houve confete. Em troca, o check chega uma fração de segundo depois da
mudança na tela, o tempo da resposta. Com movimento reduzido, o check já aparece desenhado e o
confete não sai, mas o aviso de meta atingida continua.

## 21. Cara de app no celular: barra na base, tela cheia para lançar e gestos próprios

**Contexto.** No celular, o app devia parecer nativo: navegação na base, áreas seguras, lançar uma
transação sem distração, alvos de toque grandes e gestos de puxar e arrastar.

**Decisão.**
- Abaixo de `md`, uma barra na base com Início, Extrato, o "+" no meio, Orçamento e "Mais", que
  abre uma bottom sheet (um `<dialog>` modal) com as outras telas. A partir de `md`, a sidebar.
  São cinco posições iguais, duas de cada lado, e o "+" fica no centro exato. A primeira versão
  tinha seis, com Metas na barra, e o "+" ficava meio passo à esquerda do centro: centralizá-lo
  com seis apertaria os itens da direita abaixo de 44 px. Metas foi para o "Mais" por ser a menos
  usada das quatro: os aportes saem pelo "+" (uma transação ligada à meta), e o progresso já
  aparece na Início. Com cinco colunas, cada item ganha ~78 px num celular de 390 px.
- `viewport-fit=cover` e `env(safe-area-inset-*)` no topo, na barra, na folha, nos toasts e no botão
  Salvar.
- A nova transação é tela cheia no celular, sem a barra, com foco no valor, `inputmode="decimal"` e o
  Salvar preso acima da área segura. O campo continua em centavos (decisão 3): a vírgula do teclado é
  ignorada.
- Puxar para atualizar (Início e Extrato) e swipe lateral para trocar de mês (Extrato, Contas,
  Orçamento e Análises) são componentes próprios, com a decisão do gesto em funções puras.
- `navigator.vibrate` curto quando o servidor confirma o salvar, protegido para o iOS, que não tem
  a API.
- No CSS: sem realce de toque, sem o pull-to-refresh nativo (`overscroll-behavior`),
  `touch-action: manipulation`, e campos com 16 px na camada base.

**Consequências.** Os gestos não substituem os controles: o seletor de mês continua sendo o caminho
para teclado e leitor de tela, e os dados se atualizam sozinhos ao voltar para a aba. Toques que
começam a 24 px da borda ficam para o "voltar" do iOS.

A auditoria automática (`npm run audit:mobile`, `docs/mobile.md`) já pegou três defeitos que os
testes de componente não pegariam:
- a regra de 16 px, fora das camadas do Tailwind, encolhia o valor da nova transação;
- num mês vazio, o swipe de volta caía fora da área do gesto;
- havia alvos de 36 e 20 px.

O que a emulação não alcança (teclado virtual, Safari, áreas seguras reais) está numa lista para
conferir em aparelho.

## 22. Criar categoria sem sair da nova transação

**Contexto.** Quem está lançando um gasto e não acha a categoria tinha que abandonar o formulário,
ir a Categorias e voltar, perdendo o valor já digitado.

**Decisão.** Um chip "Nova" (com "+") no fim das categorias, só em Saiu e Entrou, abre uma folha
com nome, cor e ícone. O tipo vem da transação, e a categoria criada já volta selecionada.
- Poupança fica de fora: costuma ter uma categoria só, e o caminho natural ali é a meta.
- Não é otimista, ao contrário das transações (decisão 15): o nome pode ser recusado (409), e a
  transação precisa do id real para ser salva. Ao responder, a categoria entra no cache na ordem
  por nome, sem esperar a nova busca, para o chip aparecer selecionado na hora.
- A folha é a mesma `BottomSheet` do "Mais", que do md para cima vira pop-up centralizado.
- Ela fica fora do `<form>` da transação: formulário dentro de formulário é HTML inválido e
  enviaria os dois.

**Consequências.** O mesmo formulário serve à edição de transação, então o "Nova" também aparece no
diálogo de editar (uma folha sobre o diálogo, os dois no top layer do navegador). Fechar a folha
descarta o rascunho.

## 23. Cadastro termina no e-mail, e a confirmação pede um clique

**Contexto.** A API passou a confirmar o e-mail antes de criar a conta (decisão 16 da API): o
`POST /auth/register` responde sempre `202` e a conta só nasce em `POST /auth/confirm-email`. O
front cadastrava e já entrava em seguida, o que deixa de ser possível.

**Decisão.**
- Depois de enviar o cadastro, a tela vira "Confira seu e-mail", com a mensagem da API e o endereço
  digitado, para quem errou o e-mail perceber. Não há mais o erro "e-mail já cadastrado": a API não
  diz mais isso a ninguém.
- O link do e-mail abre `/confirm-email`, que lê o token para a memória e o tira da URL, como a
  redefinição de senha. A confirmação **espera um clique** em "Confirmar meu e-mail". Depois, a
  pessoa entra com a senha, como em qualquer login.
- O `TextField` ganhou `hint`, uma orientação neutra ("Mínimo de 8 caracteres") que antes ia no
  lugar do erro e deixava o campo vermelho e inválido antes de qualquer digitação. A mensagem saiu
  de dentro do `<label>` e chega ao leitor de tela pelo `aria-describedby`.

**Consequências.** O clique existe por segurança: antivírus e leitores de e-mail abrem os links para
conferir, e uma confirmação ao carregar deixaria quem cadastrou o e-mail de outra pessoa (com a
própria senha) ganhar a conta sem a dona do e-mail fazer nada. O custo é um passo a mais para quem
está chegando, além de esperar o e-mail.

## 24. Minha Empresa: no menu só com empresa ativa, abas que chegam com cada fase

**Contexto.** O módulo de finanças PJ (decisões 17 e 18 da API) traz uma área nova, por empresa, que
vai ganhar abas fase a fase: visão geral, notas fiscais, despesas, impostos, retiradas, calendário e
contador. A maior parte dos usuários não tem CNPJ, e a barra de baixo do celular já está cheia.

**Decisão.**
- **Menu:** "Minha Empresa" só aparece com pelo menos uma empresa ativa, logo abaixo do Início. Com
  uma empresa, é um item que leva direto a ela. Com várias, o título e uma entrada por empresa (emoji
  e nome), sempre à vista, sem submenu que abre e fecha. No celular, as empresas ficam numa seção
  "Minhas empresas" no topo do "Mais", e o "Mais" fica marcado na página da empresa.
- **Rotas em inglês**, como as outras: `/companies/:companyId`, com cada aba como rota filha, para o
  voltar do navegador e os links funcionarem.
- **As abas aparecem quando a fase delas fica pronta.** Com uma aba só, a barra nem aparece. O
  cadastro mora em Minha conta, onde também ficam as arquivadas, com o desarquivar.
- **O formulário espelha as regras de enquadramento só para a experiência** (`regimeOptions.ts`,
  função pura testada): MEI trava o SIMEI, o anexo só aparece no Simples, a atividade só no MEI. Quem
  decide é a API, e o erro dela aparece no campo. O formulário avisa, desde o cadastro, até quando a
  data de abertura pode ser corrigida, e na edição trava o campo com o motivo.
- **A busca pelo CNPJ preenche só o que está em branco**: o que o usuário digitou vale mais que a
  consulta. Ela nunca impede o cadastro, e um CNPJ não encontrado avisa que os CNPJs com letras podem
  ainda não aparecer na consulta pública.

**Consequências.** Quem não tem empresa não vê nada novo além de um card em Minha conta, e o
menu não ganha um item morto. Mostrar sete abas "em breve" desde já deixaria o desenho completo à
vista, mas aba que não faz nada é ruído e, se algo for ao ar no meio do caminho, parece app
quebrado. O custo é que cada fase precisa lembrar de adicionar a aba dela em `CompanyLayout`.

## 25. Notas fiscais: envio em duas etapas, XML travado e PDF para conferir

**Contexto.** A aba Notas fiscais (decisão 20 da API) recebe arquivos que o usuário baixa do portal
da NFS-e: o XML, que tem os valores exatos, ou o PDF, que é uma impressão. Muitas vezes são vários de
uma vez, no fim do mês, e às vezes pelo celular.

**Decisão.**
- **Duas etapas.** Escolher os arquivos chama a pré-visualização da API, que não grava nada. Cada
  arquivo vira um card: o do XML com os valores travados e o aviso "lido do XML"; o do PDF com os
  campos para conferir e completar; o repetido e o recusado com o motivo da API. Cada card salva
  sozinho, e "Salvar as N notas prontas" salva os do XML **um de cada vez**, para duas notas não
  passarem juntas pela conferência da cota.
- **No celular não existe arrastar e soltar**, então o botão "Escolher arquivos" é o caminho
  principal. A área de soltar é um extra do desktop, e o texto que fala de arrastar só aparece de
  `md` para cima.
- **Multipart com `FormData`.** O tipo gerado descreve os arquivos como texto (é como o OpenAPI
  descreve binário), então o corpo tipado é só um marcador e o que vai de verdade sai do
  `bodySerializer`. O openapi-fetch deixa o navegador pôr o `Content-Type` com a fronteira.
- **Dinheiro em centavos** também aqui, com um `MoneyField` do tamanho de um campo comum: o
  `AmountInput` é o valor em destaque de uma tela, e o formulário da nota tem até dez valores.
- **A lista** é filtrada por ano e agrupada por mês de competência, com o total das ativas (serviço
  menos desconto incondicional, que não é receita). A cancelada aparece riscada, com selo. O uso da
  cota fica no rodapé.
- As notas moram debaixo da chave `["companies", id, "invoices", ...]`: arquivar a empresa recarrega
  as notas também, e a mudança `invoice` recarrega as empresas (a primeira nota trava a data de
  abertura) e o uso da cota.

**Consequências.** O usuário vê, antes de qualquer coisa ficar salva, o que foi entendido de cada
arquivo e por que algum foi recusado. O custo é um passo a mais e o arquivo viajar duas vezes (até
2 MB cada), em troca de nenhum arquivo órfão de uma pré-visualização abandonada.

## 26. Receita na visão geral com barras só de desenho, e despesas da empresa numa aba

**Contexto.** A Fase 3 trouxe a receita por competência (decisão 22 da API) e as despesas da empresa
(decisão 21 da API): avulsas, fixas com pagamento por mês e comprovantes.

**Decisão.**
- **A receita mora na Visão geral**, onde a Fase 5 vai pôr os cards do mês. O seletor Dia, Semana e
  Mês usa o período padrão de cada um (30 dias, 12 semanas, 12 meses).
- **As barras são só desenho** (`aria-hidden`). Com 12 ou 30 barras no celular, cada uma teria de
  10 a 26 px, abaixo dos 44 px de um alvo de toque, e a auditoria mobile reprovaria barras clicáveis
  como as das `MonthlyBars` de 6 meses. O card destaca o total, o período atual e o maior período, e os
  valores de cada barra ficam numa tabela `sr-only` para o leitor de tela.
- **Aba Despesas** com `MonthSwitcher` e prefetch dos meses vizinhos, como nas telas PF. O status vai
  por texto além da cor (Paga, Pendente, Atrasada). A categoria Impostos nunca é oferecida para
  escolha e aparece com cadeado na folha de categorias.
- **O comprovante sobe em dois passos** (salvar a despesa e depois o arquivo). Se o arquivo falhar
  (cota, tipo), a despesa fica salva e um aviso diz que o comprovante não subiu. A alternativa, um
  único multipart com a despesa e o arquivo, faria uma despesa válida ser recusada por causa do
  anexo opcional.
- **Corrigir o pagamento de uma fixa mostra só valor e data**, que é o que a API muda; nome e
  categoria vêm da fixa. Editar a fixa pendente abre os termos, que valem a partir deste mês.
- O `MoneyField` subiu para `shared/ui` quando ganhou o segundo uso.

**Consequências.** O gráfico fica legível e acessível em qualquer largura, ao custo de não dar para
"tocar numa barra" para ver o valor dela no celular. Os destaques e a tabela cobrem esse caso.
