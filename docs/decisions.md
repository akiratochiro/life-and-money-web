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
