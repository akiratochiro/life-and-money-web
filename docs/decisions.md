# Decisões de arquitetura — front-end

Mesmo formato do [docs/decisions.md da API](https://github.com/akiratochiro/life-and-money/blob/main/docs/decisions.md):
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

