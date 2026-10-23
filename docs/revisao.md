# Revisão estilo entrevista — front-end e integração

Perguntas que alguém faria sobre este código, com as respostas. A ideia é a mesma das revisões
das fases do back-end: explicar de volta o que foi construído, sem olhar o código, e perceber
onde a explicação trava.

Cada resposta aponta os arquivos que a sustentam. Se discordar de alguma, melhor: é exatamente
aí que a conversa fica boa numa entrevista.

---

## Integração com a API

### Como o front sabe o formato das respostas da API?

Ele não sabe por conta própria: os tipos são gerados. `npm run api:types` lê o documento
OpenAPI que a API publica em `/v3/api-docs` e escreve `src/shared/api/schema.d.ts`. O
`openapi-fetch` usa esse arquivo para tipar o caminho, os parâmetros, o corpo e a resposta de
cada chamada, então `api.GET("/transactions", { params: { query: { month } } })` só compila se
o endpoint existir com esse parâmetro.

O back-end é a fonte da verdade. Um campo renomeado na API quebra o `tsc`, e a CI roda
`npm run build`, que inclui o `tsc`: a quebra aparece antes do merge, não em produção.

**O que isso custa:** um passo manual. Quando um endpoint muda, é preciso rodar o `api:types`
com a API no ar e commitar o arquivo gerado no mesmo commit que consome a mudança.

### Os campos das respostas eram todos opcionais. O que mudou e por quê?

O springdoc marca como obrigatório só o que está anotado. Sem `@Schema(requiredMode = REQUIRED)`
nos records de resposta, tudo era gerado como opcional, e o front compensava com `?? 0` em cada
leitura — um valor de fallback para um nulo que nunca chegava.

Depois de anotar as respostas na API, esses fallbacks saíram. Os que sobraram são os que
correspondem a um nulo real, e a API agora diz na descrição do campo por que ele pode faltar:

| Campo | Quando falta |
|---|---|
| `averages` | O usuário não tem nenhum mês fechado desde o cadastro |
| `usedPercentage` | O limite do mês é zero, então não há percentual a calcular |
| `monthlyNeeded` | O prazo da meta já passou |
| `goalId`, `description` | O usuário não preencheu |

**A lição:** um tipo que diz "pode ser nulo" sobre algo que nunca é nulo não é cautela, é
informação errada. Ele obriga o código a tratar um caso impossível e, pior, esconde os casos
que são possíveis de verdade no meio do ruído.

### De onde vêm as mensagens de erro que aparecem na tela?

Da API. Ela responde em RFC 9457 (`ProblemDetail`), e o `detail` já vem em português, escrito
para o usuário. O `unwrap` em `shared/api/problem.ts` transforma a resposta de erro num
`ApiError` que carrega esse texto como `message`, e a tela mostra como está.

Para erros de validação, o `ProblemDetail` traz a propriedade `errors`, um mapa de campo para
mensagem. É isso que o `RegisterPage` usa para marcar o campo errado no formulário, em vez de
mostrar um aviso genérico no rodapé.

Em alguns pontos o front traduz o status para um texto mais específico, porque sabe o contexto
que a API não sabe: o 409 ao criar uma categoria vira "Já existe uma categoria ativa com esse
nome e esse tipo." Isso vale enquanto cada endpoint tem um só motivo para aquele status.

### Por que o `unwrap` existe, se o `openapi-fetch` já devolve `{ data, error }`?

Porque `{ data, error }` espalharia uma verificação por toda chamada, e o TanStack Query espera
uma promessa que rejeita para marcar a query como erro. O `unwrap` faz a ponte: recebe
`{ data, error, response }`, lança `ApiError` quando há erro, e devolve `data` tipado quando
não há. O `expectNoContent` é o irmão dele para respostas 204, que não têm corpo.

---

## Sessão e segurança

### Onde fica o token do usuário?

O access token fica numa variável de módulo em `shared/auth/session.ts` — só na memória da aba.
Não há nada no `localStorage` nem no `sessionStorage`. O refresh token está num cookie
`HttpOnly` com `Path=/auth`, que este código nunca lê.

**Por que isso importa:** um token em storage é legível por qualquer script que consiga rodar na
página. Com o token em memória, um XSS consegue usar a sessão enquanto a página está aberta, mas
não consegue copiar nada para usar depois. E o refresh token, que é o que valeria por 30 dias,
está fora do alcance do JavaScript por decisão do navegador, não por disciplina do código.

### Se o token está só em memória, como a sessão sobrevive a um recarregamento?

Pelo cookie. O `SessionProvider` dispara uma tentativa de renovação (`POST /auth/refresh`) ao
montar; o navegador envia o cookie sozinho, a API devolve um access token novo e a sessão volta.

Esse é o motivo do estado `loading` em `sessionContext.ts`. Logo depois de recarregar, o app
ainda não sabe se há sessão. Sem o estado intermediário, o `RequireAuth` mandaria para o login
um usuário que está perfeitamente logado — a sessão existe, só não chegou ainda.

### E se dois pedidos de renovação acontecerem ao mesmo tempo?

Eles compartilham a mesma promessa. O `renewSession` guarda a requisição em voo em `renewal` e
devolve a mesma a quem chamar enquanto ela não terminar.

Isso não é otimização, é correção. A home abre disparando várias consultas de uma vez; se cada
uma renovasse em paralelo, e como **cada renovação rotaciona o refresh token**, a segunda
apresentaria um token que a primeira acabou de invalidar. A API trataria isso como reuso, e
revogaria todas as sessões do usuário — ele seria desconectado justamente por abrir o app.

### Por que renovar antes de vencer, em vez de reagir ao 401?

Reagir ao 401 significa refazer a requisição original depois de renovar, e aí aparece um
detalhe do `fetch`: depois que o `Request` é enviado, o corpo dele já foi consumido e não pode
ser reenviado. Seria preciso clonar o `Request` no `onRequest` e guardar a cópia para usar no
`onResponse`. Funciona, mas é mais mecânica do que o ganho justifica.

A escolha foi renovar 30 segundos antes do vencimento, dentro do `onRequest`: na prática o 401
por token expirado deixa de acontecer. O 401 continua tratado no `onResponse`, mas como o que
ele passou a significar — a sessão acabou de verdade (o refresh falhou, o servidor reiniciou com
outro segredo, a sessão foi revogada). Aí o `endSession` avisa o `SessionProvider`, que muda o
estado, e o `RequireAuth` navega para o login.

**Como eu saberia que essa escolha ficou errada:** se aparecessem 401 nos logs em situações
normais de uso. Isso indicaria que a renovação proativa não está cobrindo algum caminho, e a
retentativa passaria a valer a complexidade.

### A API exige o header `X-Refresh-Request` no refresh. Para que serve?

Para barrar CSRF. Em produção o front e a API ficam em domínios diferentes, então o cookie
precisa ser `SameSite=None` — e aí o navegador o enviaria também num POST disparado por outro
site. Um `POST /auth/refresh` forjado não leria a resposta (o CORS impede), mas rotacionaria o
refresh token da vítima, e o front dela seria desconectado no uso seguinte.

Exigir um header que não está na lista segura do CORS obriga o navegador a fazer o preflight
antes do POST, e o preflight só passa para as origens que a API permite. A requisição forjada
não chega ao endpoint. Dá para verificar isso com dois `curl`: o `OPTIONS` da origem permitida
responde 200, e o de qualquer outra responde 403.

### O que acontece no logout?

O `useLogout` chama `revokeSession()` **antes** de limpar o cache do React Query e navegar. A
ordem importa: sem a chamada ao servidor, o refresh token continuaria válido no banco até
vencer, e apagar o estado local só esconderia uma sessão que ainda existe.

No servidor, o `/auth/logout` revoga a linha e devolve o cookie vazio com `Max-Age=0`, que é
como se apaga um cookie no navegador.

---

## Estado e dados

### Por que não existe um store global?

Porque quase todo o estado da aplicação é estado do servidor, e para esse tipo de estado o
TanStack Query resolve mais do que um store: cache por chave, invalidação depois das escritas,
estados de carregamento e de erro, e deduplicação de requisições iguais.

O `useState` guarda só estado de interface — o mês selecionado, qual card está aberto, o valor
digitado num campo. Nenhum dado do servidor é copiado para dentro de um `useState`, então não
existe a classe de bug em que a tela mostra um valor e o servidor tem outro.

### Como a tela se atualiza depois de criar uma transação?

Por invalidação de chaves. O `useCreateTransaction` tem
`onSuccess: () => invalidateQueries(["dashboard"]), (["goals"]), (["transactions"])`, porque uma
transação mexe nos três: o saldo, o progresso das metas e o extrato. O React Query refaz as
consultas ativas, e as telas se redesenham.

**O ponto fraco:** essas chaves são um contrato implícito. Esquecer uma delas deixa uma tela
desatualizada, e nada no compilador avisa. Um jeito de reduzir o risco seria centralizar as
chaves num módulo só delas, em vez de repetir strings nos módulos de API.

### Por que `staleTime: 30_000` e `retry: 1`?

Os dois estão em `app/App.tsx`. O `staleTime` de 30 segundos evita refazer requisições a cada
troca de tela num app onde os dados mudam em escala de minutos, não de segundos — navegar entre
Início e Extrato não dispara nada novo. O `retry: 1` dá uma segunda chance a uma falha de rede
passageira, sem insistir numa API que está realmente fora.

### Por que os formulários de dinheiro trabalham com centavos?

Para não brigar com vírgula, ponto e arredondamento enquanto o usuário digita. O `AmountInput`
mantém um inteiro de centavos, descarta tudo que não é dígito e formata com `Intl.NumberFormat`:
digitar `25075` mostra `R$ 250,75`. A conversão para o formato da API acontece num só lugar, na
hora de enviar (`cents / 100`), e o valor chega com no máximo duas casas decimais por
construção — que é o que a validação da API exige.

O `PercentInput` segue a mesma ideia com centésimos de ponto percentual, limitado a 10.000, que
é 100%.

---

## Interface

### Como o app se comporta no celular e no desktop?

É um layout só, com dois arranjos no `AppShell`. No celular, uma barra fixa embaixo com quatro
destinos e o botão de nova transação no centro, destacado; no desktop (`lg:`), a mesma navegação
vira uma coluna à esquerda e ganha os dois destinos que não cabiam embaixo, Análises e
Categorias.

Os alvos de toque têm `h-11` (44px), que é o mínimo recomendado para o dedo. A decisão de pensar
primeiro no celular é sobre o uso real: a despesa é lançada na hora em que acontece, de pé, no
caixa.

### Como os estados de carregamento e de erro são tratados?

Com esqueletos do tamanho do conteúdo que vai aparecer (`animate-pulse` com a altura da área
final), em vez de um spinner centralizado. O layout não salta quando os dados chegam.

Os blocos de erro têm `role="alert"` e oferecem uma ação, não só o aviso: a home tem um "Tentar
de novo" que refaz as três consultas que ela depende.

### O que foi feito de acessibilidade?

O que dá para sustentar numa conversa, não uma lista de boas intenções:

- os gráficos têm texto alternativo real. A rosca é `role="img"` com um `aria-label` que
  enumera as categorias e os percentuais; as barras mês a mês têm `aria-label` por mês,
  incluindo "em andamento" para o mês atual;
- os grupos de escolha usam `aria-pressed` e `role="group"` com rótulo, então um leitor de tela
  anuncia o que está selecionado;
- as áreas que carregam têm `aria-busy` e um rótulo;
- o diálogo de editar transação é um `<dialog>` com `showModal()`, o que traz foco preso e
  fechamento pelo Esc do próprio navegador, em vez de uma reimplementação;
- os ícones decorativos têm `aria-hidden`, para não serem lidos duas vezes.

**O que falta:** não houve teste com leitor de tela de verdade, nem verificação de contraste
medida. A paleta é escura com acento laranja, e os tons `text-muted` sobre `surface` são os
candidatos mais prováveis a ficar abaixo de 4.5:1.

### O botão de esconder valores — por que existe e como funciona?

É para poder abrir o app em público sem mostrar quanto se tem. O `PrivacyProvider` guarda a
preferência no `sessionStorage` e o componente `Money` troca o valor por `R$ ••••`.

Como todo valor da tela passa pelo `Money`, o recurso vale em todas as telas sem nenhuma delas
precisar saber dele. É a vantagem de ter um componente só para formatar dinheiro: ele é o lugar
onde dá para mudar o comportamento de uma vez.

### Por que o contexto e o hook ficam em arquivos separados?

Por causa do fast refresh. Um arquivo que exporta um componente e também uma função perde a
atualização em tempo real do Vite, e a regra `react-refresh/only-export-components` do ESLint
aponta isso — era um erro de lint que derrubava a CI.

O contexto e o hook ficaram em `privacyContext.ts` e `sessionContext.ts`, e os arquivos `.tsx`
exportam só o componente. Vale para os dois providers, privacidade e sessão.

---

## O que eu mudaria

Em ordem de quanto incomoda:

1. **Não há um único teste no front.** A API tem 40, o front tem zero. O que mais pede teste
   não são as telas, são as regras puras: `dates.ts`, `money.ts`, o `bySeverity` do
   `budgetAlerts`, e sobretudo o `session.ts`, cujo comportamento de renovação concorrente é
   justamente o tipo de coisa que quebra sem avisar. Vitest com `@testing-library/react` cobriria
   isso e entraria na CI junto com o lint e o build;
2. **O `ProblemDetail` é declarado à mão** em `problem.ts`, enquanto todo o resto dos tipos é
   gerado. A API ainda não documenta as respostas de erro no OpenAPI; documentar lá e deixar o
   tipo ser gerado fecharia a última ponta solta do contrato;
3. **As chaves de cache são strings repetidas** entre os módulos de API. Centralizá-las tornaria
   explícito quem invalida o quê;
4. **O bundle tem 425 KB** (126 KB comprimido) num único arquivo. Como todas as telas estão
   atrás do login, dividir por rota com `lazy` só ajudaria de verdade no login e no cadastro —
   que é, justamente, a primeira coisa que um visitante novo carrega;
5. **O app não é instalável.** É usado no celular, mas abre pelo navegador. Um manifest e um
   service worker dariam o atalho na tela inicial e um comportamento melhor com a rede ruim.
