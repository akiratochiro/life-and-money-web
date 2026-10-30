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
  `["transactions"]`, `["dashboard"]` e `["goals"]`). `useState` só para estado de interface.
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
- **Token de redefinição de senha:** a `ResetPasswordPage` lê o token da URL uma vez, para o
  estado, e o tira da URL com `navigate(..., { replace: true })`. O `index.html` tem
  `referrer no-referrer` para o app inteiro. Não carregue recursos de terceiros nessa tela.
- **O Worker repassa o IP do usuário** em `X-Client-IP`, com o secret `PROXY_SHARED_SECRET` em
  `X-Proxy-Auth`, e descarta essas versões vindas do navegador. Sem o secret, todos os usuários
  dividiriam um único limite de tentativas na API.
- **429:** `ApiError.retryAfterSeconds` + `useRetryCountdown` mostram quanto esperar e travam o
  botão. A renovação da sessão espera o `Retry-After` e repete (o 429 vem antes de o token girar).
- **Mensagens de erro vêm da API** (RFC 9457): o `detail` já chega em português e é mostrado
  como está; o mapa `errors` marca os campos do formulário.

## Regras de trabalho

- **Sou dev júnior** e uso este projeto como portfólio e preparação para entrevistas. Explique
  o porquê das escolhas e os trade-offs, para eu conseguir defendê-las numa entrevista.
- **Passos pequenos, um commit por passo**, em Conventional Commits (`feat:`, `fix:`, `test:`,
  `docs:`, `build:`, `ci:`, `chore:`, `refactor:`).
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
