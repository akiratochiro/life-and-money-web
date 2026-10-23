# Life and Money — web

[![CI](https://github.com/akiratochiro/life-and-money-web/actions/workflows/ci.yml/badge.svg)](https://github.com/akiratochiro/life-and-money-web/actions/workflows/ci.yml)

Front-end do Life and Money, um app de controle financeiro pessoal: lançamentos do dia a dia,
orçamento por categoria, metas de poupança e análises mês a mês.

Consome a [Life and Money API](https://github.com/akiratochiro/life-and-money). Pensado primeiro
para o celular — é nele que a despesa é lançada na hora em que acontece.

## Telas

| Tela | O que resolve |
|---|---|
| Início | Um feed na ordem do que importa: saldo do mês, o que precisa de atenção, metas e orçamento |
| Nova transação | Lançar entrada, saída ou aporte em poucos toques, com atalhos de "hoje" e "ontem" |
| Extrato | Transações do mês agrupadas por dia, com edição e exclusão |
| Orçamento | Limite por categoria, em reais ou em percentual da receita, com vigência por mês |
| Metas | Quanto falta, quanto guardar por mês e o prazo de cada meta |
| Análises | Rosca de gastos por categoria e barras mês a mês, com a média dos meses fechados |
| Categorias | Criar, renomear e arquivar as próprias categorias |

## Stack

React 19 · TypeScript · Vite · React Router · TanStack Query · Tailwind CSS 4 ·
openapi-fetch + openapi-typescript

## Decisões de arquitetura

As principais estão em [docs/decisions.md](docs/decisions.md). Em resumo:

- **Tipos gerados a partir do OpenAPI da API**, nunca escritos à mão: o contrato do back-end é a
  fonte da verdade, e uma mudança incompatível aparece como erro de compilação
- **Organização por feature** (`features/transactions`, `features/budget`...), com o que é
  compartilhado em `shared/`
- **TanStack Query cuida do estado do servidor**; não há store global de dados do servidor
- **Dinheiro em centavos** nos formulários, para não arredondar errado antes de enviar
- **Erros vêm prontos da API** (RFC 9457): o `detail` já chega em português e vai direto para a tela
- **O access token vive só em memória**; quem devolve a sessão depois de um recarregamento é um
  cookie `HttpOnly` que este código nunca lê

## Rodando localmente

Requisitos: Node 22+ e a API rodando em `http://localhost:8080`.

```bash
git clone https://github.com/akiratochiro/life-and-money-web.git
cd life-and-money-web
npm install
cp .env.example .env     # VITE_API_URL aponta para a API
npm run dev
```

O app sobe em `http://localhost:5173`.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Checa os tipos (`tsc -b`) e gera o bundle de produção |
| `npm run preview` | Serve o bundle gerado, para conferir o build |
| `npm run lint` | ESLint em todo o projeto |
| `npm run api:types` | Regenera `src/shared/api/schema.d.ts` a partir do OpenAPI da API |

Sempre que um endpoint ou um campo muda na API, rode `npm run api:types` com a API no ar e
commite o arquivo gerado junto com a mudança que o consome.

## Publicação

O build gera arquivos estáticos, servidos no Cloudflare Pages:

| Campo | Valor |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Variável de build | `VITE_API_URL` com a URL da API, sem barra no final |

O `public/_redirects` manda qualquer rota para o `index.html`. Sem ele, abrir `/goals` direto
na barra de endereço daria 404: o roteamento é do React Router, e o servidor de arquivos
estáticos não conhece essas rotas.

O passo a passo completo, incluindo a API e o banco, está no
[docs/deploy.md da API](https://github.com/akiratochiro/life-and-money/blob/main/docs/deploy.md).

## Roadmap

- [ ] Instalável como PWA, com atalho na tela inicial
- [ ] Retirada de uma meta de poupança (depende da API)
