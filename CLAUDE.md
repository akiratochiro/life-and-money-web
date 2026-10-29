# CLAUDE.md — Life and Money web

Front-end do Life and Money, mobile first. Consome a API em `../life-and-money-api`.

Leia [README.md](README.md) para a visão geral, [docs/decisions.md](docs/decisions.md) para o
porquê das escolhas e [docs/revisao.md](docs/revisao.md) para as mesmas escolhas em perguntas e
respostas.

## Stack

React 19 · TypeScript · Vite · React Router · TanStack Query · Tailwind CSS 4 ·
openapi-fetch + openapi-typescript.

Deploy: front estático no **Cloudflare Workers** (`wrangler.jsonc`, SPA com
`not_found_handling: single-page-application`), API no **Render** (free), banco no **Neon** (free).

## Comandos

```bash
npm run dev         # http://localhost:5173 (API em VITE_API_URL, lida no build; ver .env.example)
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
