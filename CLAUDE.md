# CLAUDE.md — Life and Money web

Front-end do Life and Money, mobile first. Consome a API em `../life-and-money-api`.

Leia [README.md](README.md) para a visão geral, [docs/decisions.md](docs/decisions.md) para o
porquê das escolhas e [docs/revisao.md](docs/revisao.md) para as mesmas escolhas em perguntas e
respostas.

## Stack

React 19 · TypeScript · Vite · React Router · TanStack Query · Tailwind CSS 4 ·
openapi-fetch + openapi-typescript.

Deploy: front no **Cloudflare Workers** (`wrangler.jsonc`), API no **Render** (free), banco no
**Neon** (free). O Worker serve os estáticos (SPA com `not_found_handling: single-page-application`)
e faz proxy de `/api/*` para a API (`worker/index.ts`, só esse caminho executa script).

## Comandos

```bash
npm run dev         # http://localhost:5173; o proxy do Vite repassa /api/* para localhost:8080
npm run build       # tsc -b + bundle de produção; é o que a CI roda
npm run lint        # ESLint
npm test            # Vitest uma vez (npm run test:watch para modo watch)
npm run api:types   # regenera src/shared/api/schema.d.ts a partir da API no ar
npm run audit:mobile  # iPhone emulado: alvos, fontes, overflow e gestos (docs/mobile.md)
```

## Arquitetura

- **Tipos gerados do OpenAPI, nunca escritos à mão.** `npm run api:types` gera
  `src/shared/api/schema.d.ts`, que é commitado. Não edite esse arquivo nem declare interfaces
  que dupliquem o contrato da API; o `openapi-fetch` tipa caminho, parâmetros, corpo e resposta.
- **Organização por feature:** `src/features/<feature>/` contém telas, componentes e o módulo de
  API (`budgetApi.ts`). O que é compartilhado de verdade fica em `src/shared/` (`api`, `auth`,
  `ui`, `lib`, `privacy`); algo só sobe para `shared/` quando um segundo lugar precisa dele.
  `src/app/` tem o shell, rotas e providers.
- **TanStack Query é o único dono do estado do servidor.** Não crie store global. Cada feature
  expõe hooks e as mutações invalidam as chaves afetadas (uma transação invalida
  `["transactions"]`, `["dashboard"]`, `["goals"]` e `["bills"]`, porque pode ser o pagamento de
  uma conta; pagar uma conta invalida `["bills"]`, `["transactions"]` e `["dashboard"]`). `useState` só para estado de interface.
- **Design system "Cofrinho de argila"** (decisões 18 a 20), tokens no `@theme` do `src/index.css`:
  - **nunca cor fixa** (`#...`, `text-[#...]`) em componente: use o token pelo papel;
  - **`accent` só para ação primária e ponto de atenção**; selecionado/segmentado usa argila neutra
    (`bg-surface shadow-clay-sm`), link usa `text-link`;
  - **texto semântico usa o tom `-strong`** (`text-income-strong`); `bg-income` é preenchimento,
    `bg-income-soft` é fundo de selo;
  - cor nova no tema precisa passar no `src/theme.test.ts` (contraste AA);
  - cor e ícone de categoria vêm de `features/categories/categoryLook.ts` (dados) e
    `CategoryGlyph.tsx` (desenho); valor novo da API exige entrada nos dois e tokens `cat-*`.
- **Celular** (decisão 21): abaixo de `md`, barra na base e "Mais" em `BottomSheet`; tela cheia
  em `FULL_SCREEN_ON_MOBILE` (`AppShell`). Alvo de toque com no mínimo 44×44 px, campo com no mínimo
  16 px, nada que dependa de hover, e áreas seguras com `env(safe-area-inset-*)` em tudo que é
  `fixed` ou `sticky` na base. Gesto novo: decisão em função pura (`shared/gestures/gestures.ts`),
  nunca substituindo um controle. Mexeu em layout, navegação ou formulário: rode o
  `npm run audit:mobile` e confira a lista de aparelho real em `docs/mobile.md`.
- **Formas flutuantes** (`shared/brand/FloatingShapes`): só no login e no `EmptyState`, nunca atrás de
  números; só `transform`, `motion-safe`. Ilustrações de terceiros são CC BY 4.0: manter o crédito em
  Minha conta e no README.
- **Comemoração só depois do servidor**: check de salvo e confete (`useCelebrate`) no `onSuccess`,
  nunca no `onMutate` da otimista.
- **O que cada mutação recarrega está em `shared/api/invalidation.ts`** (`AFFECTS`), com um teste
  por linha. Mutação nova usa `useInvalidate()`/`invalidate()` com o `Change` certo; mudança que
  afeta outra tela entra no mapa e no teste, nunca numa lista solta no módulo.
- **Atualização otimista** (decisão 15) em transações, aporte em meta e arquivar categoria: cancelar
  as buscas, guardar a foto (`getQueriesData`), mudar o cache, e no erro devolver a foto e mostrar
  `useToast()` com o `message` da API. Regras de lista são funções puras em `optimistic.ts`.
- **O cache é apagado quando a sessão termina** (`SessionProvider`) e no login/cadastro (decisão 14):
  as chaves não identificam o usuário.
- **Carregamento:** skeleton no formato do componente (`shared/ui/Skeleton.tsx` + um por tela), nunca
  um bloco genérico; botão que envia usa `PendingLabel` (spinner sem mudar a largura). Telas com
  mês usam `usePrefetchAdjacentMonths` com a fábrica `xxxQuery(month)` do módulo de API.
- **Animação** (decisão 16): só `m` de `motion/react` (o `LazyMotion` é `strict`), presets em
  `shared/ui/motion.ts`, 150 a 250 ms, e listas com `AnimatePresence initial={false}`, para não animar
  o primeiro lote nem atrasar o LCP.
- **Dinheiro em centavos nos formulários.** `AmountInput` guarda um inteiro em centavos;
  `PercentInput`, centésimos de ponto percentual. A conversão para reais (`cents / 100`)
  acontece só na fronteira com a API, na hora de enviar.
- **Access token só em memória** (variável de módulo em `shared/auth/session.ts`). Nunca use
  `localStorage`/`sessionStorage` para tokens. O refresh token fica em cookie `HttpOnly` que
  este código nunca lê; o `SessionProvider` renova ao abrir o app, e o middleware renova quando
  faltam menos de 30 s para vencer. Renovações concorrentes compartilham a mesma promessa.
- **Front e API na mesma origem.** Toda chamada usa o caminho relativo `/api` (`shared/api/base.ts`):
  em produção o Worker repassa para o Render, no dev o proxy do Vite repassa para o localhost. Não
  existe URL da API no build. Nunca chame a API por URL absoluta: o cookie de refresh
  (`Path=/api/auth`, `SameSite=Strict`) só funciona na mesma origem.
- **A API pode estar hibernando** (Render free). Ao abrir, `shared/api/serverWake.ts` bate no
  `/health` e o `ServerWakeOverlay` aparece se passar de ~2 s; a renovação da sessão espera o
  servidor. As regras de rede ficam em `shared/api/retryPolicy.ts`: queries repetem só erros
  transitórios (rede, timeout, 502/503/504) e leituras (GET) têm timeout de 20 s. **Escrita nunca
  ganha timeout nem retry** (duplicaria lançamentos), e o refresh só repete 502/503, porque
  reenviar um token já rotacionado revoga todas as sessões do usuário.
- **Cadastro com confirmação de e-mail** (decisão 23): o cadastro termina em "Confira seu e-mail",
  sem sessão. `/confirm-email` tira o token da URL e só confirma com o clique no botão, nunca ao
  carregar (antivírus de e-mail abrem links). Orientação de campo vai em `hint` no `TextField`,
  nunca em `error`.
- **Privacidade** (`features/legal/PrivacyPage`, pública): descreve o que o código faz. Mudou um
  cookie, um serviço externo ou um dado guardado, muda o texto e a data dela.
- **Token de redefinição de senha:** a `ResetPasswordPage` lê o token da URL uma vez, para o
  estado, e o tira da URL com `navigate(..., { replace: true })`. O `index.html` tem
  `referrer no-referrer` para o app inteiro. Não carregue recursos de terceiros nessa tela.
- **O Worker repassa o IP do usuário** em `X-Client-IP`, com o secret `PROXY_SHARED_SECRET` em
  `X-Proxy-Auth`, e descarta essas versões vindas do navegador. Sem o secret, todos os usuários
  dividiriam um único limite de tentativas na API.
- **429:** `ApiError.retryAfterSeconds` + `useRetryCountdown` mostram quanto esperar e travam o
  botão. A renovação da sessão espera o `Retry-After` e repete (o 429 vem antes de o token girar).
- **Minha conta** (`features/account`) concentra sair, exportar e excluir; a Início só tem o atalho.
  Depois de excluir, `endSession({ expired: false })`, para o login não dizer que a sessão expirou.
- **Datas como texto `AAAA-MM-DD`, nunca `new Date("AAAA-MM-DD")`**, que é lido em UTC e cai no
  dia anterior no Brasil. Para montar datas, use o construtor local `new Date(ano, mês - 1, dia)`
  (`shared/lib/dates.ts`, `features/bills/calendar.ts`).
- **Contas** (`features/bills`): o calendário é CSS grid sem biblioteca (decisão 11), e o status
  aparece por forma além da cor. O vencimento (inclusive dia 31 em fevereiro) é calculado pela API;
  o front só posiciona a data. No celular, a tela é alcançada pelo card da Início.
- **Feriados e prazo** (decisão 13): o feriado pinta o dia no calendário, sem virar marcador de
  conta. O prazo (`payableUntil`) e o status vêm da API; **o front não calcula dia útil**. A
  consulta de feriados (`features/bills/holidaysApi.ts`) fica em cache para sempre quando
  `available`, e um minuto quando não. Sempre deixe claro na tela que só entram feriados nacionais.
- **Minha Empresa** (`features/company`, decisão 24; plano em `../implementacao_pj*.md`): rotas
  `/companies/:companyId` com abas como rotas filhas, que entram em `TABS` do `CompanyLayout` quando a
  fase delas fica pronta; as abas leem a empresa por `useCompanyContext()`. No menu só com empresa
  ativa (`CompanyNav` no `AppShell`, seção no topo do "Mais"). As regras dos dropdowns ficam em
  `regimeOptions.ts` (puras, espelham a API só para a UX). Toda chave começa com `"companies"` e a
  mudança é `"company"` no `AFFECTS`. CNPJ vai para a API sem pontuação (`cnpj.ts`): a barra quebraria
  o caminho de `/cnpj/{cnpj}`.
- **Notas fiscais** (`features/invoices`, decisão 25): **só XML, por enquanto**; envio em duas etapas
  (pré-visualização → salvar por card); upload é `FormData` no `bodySerializer` (o tipo gerado é só
  marcador). Valores sempre do XML, travados; o PDF aparece recusado com a orientação da API.
  "Salvar todas" salva um de cada vez. Download por `downloadInvoiceFile` (`shared/lib/download.ts` lê o
  `filename*`). Chaves debaixo de `["companies", id, "invoices"]`; a mudança é `"invoice"`.
- **Receita e despesas da empresa** (decisão 26): `RevenueCard` (em `features/invoices`) na Visão geral,
  com barras só de desenho e uma tabela `sr-only`; nada de barra clicável com mais de ~6 barras (alvo
  de 44 px). `features/companyExpenses`: aba Despesas com `expenseMonthQuery` + prefetch, status por
  texto, Impostos (`system`) nunca escolhível, comprovante em dois passos (salvar, depois o arquivo),
  pagamento de fixa corrigido só em valor e data. A mudança é `"companyExpense"` no `AFFECTS`.
- **Retiradas e a ponte PJ → PF** (decisão 29): lançar é um botão depois de salvar (só o "sou eu");
  a transação lançada tem `origin` e abre no extrato com valor e data travados (`TransactionForm` com
  `locked`). Excluir pergunta pela outra ponta; "as duas" é a exclusão da retirada com `deletePersonal`.
  A mudança `withdrawal` recarrega empresas e finanças pessoais.
- **Caixa da empresa** (`companyOverview/CashCard`, decisão 30): topo da visão geral, sempre "hoje" (chave
  `["companies", id, "cash"]`, fora do mês dos cards). O front só mostra: saldo, reserva e a frase do
  governo vêm prontos da API. Saldo e reserva abrem com `aria-expanded`; valores com `whitespace-nowrap`.
- **Monitor do Fator R** (`companyOverview/FatorRCard`, decisão 31): depois do caixa, só com `applies`; chave
  `["companies", id, "fator-r"]`; o faturamento esperado é a mudança `"expectedRevenue"` (só empresas, nunca
  o Início). A API manda `null` em campo vazio, embora o tipo gerado diga opcional: compare com `!= null`.
- **Limites de faturamento** (`companyOverview/RevenueLimitsCard`, decisão 33): depois do Fator R, só no MEI e no
  Simples (`applies`); a barra é do `mainLimit` (no Simples, o próximo não passado), as frases e o alerta vêm da
  API, e o percentual usa `percent` (sem arredondar para cima, como as frases). Virar EPP é aviso, não vermelho.
- **Calendário fiscal** (`features/calendar`, decisão 32): um único `shared/ui/MonthCalendar` (as Contas
  usam o mesmo, pelo `BillCalendar`); `/calendar` com o filtro na URL (`?scope=PF|PJ&company=`) e a aba
  `calendar` de cada empresa travada nela. Só mostra e leva à tela de cada coisa (`events.ts`), nunca paga.
  O número de lembretes (`/calendar/reminders`) fica no item do menu e no "Mais". A família `"calendar"`
  entra no `AFFECTS` de toda mudança que mexe em vencimento ou status.
- **Mensagens de erro vêm da API** (RFC 9457): o `detail` já chega em português e é mostrado
  como está; o mapa `errors` marca os campos do formulário.

## Regras de trabalho

- **Sou dev júnior** e uso este projeto como portfólio e preparação para entrevistas. Explique
  o porquê das escolhas e os trade-offs, para eu conseguir defendê-las numa entrevista.
- **Passos pequenos, um commit por passo**, em Conventional Commits (`feat:`, `fix:`, `test:`,
  `docs:`, `build:`, `ci:`, `chore:`, `refactor:`).
- **Commits direto na `main`, sem branches nem pull requests.** Cada passo vira um commit na
  `main`, e o push é feito ao fim da tarefa, depois de os testes e o build passarem na máquina.
  Push na `main` vai para o ar (a API no Render, o front no Cloudflare Workers) e a CI só roda
  depois, então nada quebrado pode ser enviado. Quando a mudança atravessa os dois repositórios,
  o push da API vem primeiro, e o do front só depois que o deploy da API terminar.
- **Toda regra de negócio nova precisa de teste.** Vitest + Testing Library em jsdom, configurados
  no bloco `test` do `vite.config.ts` (setup em `src/test/setup.ts`). O arquivo de teste fica ao
  lado do código (`money.ts` → `money.test.ts`), com imports explícitos de `vitest` (sem globals).
  Regra pura vira função testada isoladamente; componente é testado pelo que o usuário vê e faz
  (`getByLabelText`, `getByRole`, `userEvent`), não por detalhes de implementação.
- **Nenhum serviço ou dependência paga.** Se algo tiver plano gratuito com limite, me informe o
  limite atual (conferido na fonte oficial, com a data) antes de adotar.
- **Se o contrato da API mudar**, atualize o OpenAPI na API, rode `npm run api:types` com a API
  no ar e commite o `schema.d.ts` junto com o código que consome a mudança.
- **Novas decisões relevantes vão para [docs/decisions.md](docs/decisions.md)**, no formato
  Contexto / Decisão / Consequências, numeradas em sequência.
