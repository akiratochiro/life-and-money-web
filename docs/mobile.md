# Celular: auditoria automática e validação em aparelho real

## Auditoria automática (`npm run audit:mobile`)

O Chrome emula um iPhone 13 (390×844, DPR 3, toque, `isMobile`) e, em cada tela (login, Início,
Extrato, Orçamento, Metas, Contas, Análises, Categorias, Minha conta e Nova transação, além de
cadastro e privacidade, antes de entrar):

- mede todo elemento tocável e falha se algum tiver menos de 44×44 px (links no meio de um parágrafo
  são exceção, como na WCAG);
- falha se algum campo tiver fonte computada menor que 16 px (o iOS dá zoom ao focar);
- falha se a página rolar na horizontal;
- falha se o CSS tiver regra `:hover` que mostre ou esconda conteúdo (interação que depende de hover);
- executa os gestos com toques reais pelo protocolo do Chrome: swipe para os dois lados no Extrato,
  rolagem vertical (não pode trocar de mês), puxar para atualizar na Início (curto e longo), o "Mais"
  e o "+".

As capturas e o `report.json` ficam em `mobile-audit/` (ignorado pelo git).

Para rodar, com a API e o front de pé:

```bash
# API local (na pasta da API), sem rate limit para os logins repetidos da auditoria
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run -Dspring-boot.run.arguments="--server.port=8081 --app.rate-limit.enabled=false"

# Front (nesta pasta): o build de produção, servido pelo preview
npm run build && API_PROXY_TARGET=http://localhost:8081 npx vite preview --port 4173

# Um usuário de teste do banco local, com algumas transações
AUDIT_EMAIL=... AUDIT_PASSWORD=... npm run audit:mobile
```

Rode sempre que mexer em layout, navegação ou formulário.

## O que só um aparelho real confirma

A emulação do Chrome não reproduz o Safari do iOS, nem o teclado virtual, nem o hardware. Antes de
dar uma mudança de celular como pronta, confira num iPhone (Safari) e num Android (Chrome):

**Áreas seguras (iPhone com notch ou Dynamic Island, e Android com barra de gestos)**
- [ ] O topo das telas não fica embaixo do notch ou da Dynamic Island, em pé e deitado.
- [ ] A barra de baixo não fica embaixo da barra de gestos, e o "+" não é cortado.
- [ ] O botão Salvar da nova transação e a folha "Mais" respeitam a barra de gestos.
- [ ] Os toasts aparecem acima da barra de baixo.

**Teclado**
- [ ] Tocar no "+" abre a nova transação e o teclado já sobe no valor. O iOS só abre o teclado quando
      o foco acontece no mesmo gesto do toque; se não abrir, o foco precisa ser dado no toque do "+".
- [ ] O teclado é o numérico com vírgula (iOS: o de "decimal pad"; Android: o numérico).
- [ ] Com o teclado aberto, o Salvar continua visível e tocável.
- [ ] Focar a descrição, a data ou qualquer campo não dá zoom na página (iOS).

**Gestos**
- [ ] Puxar para atualizar na Início e no Extrato funciona, sem o "quique" do iOS nem o recarregar
      nativo do Chrome Android.
- [ ] O swipe lateral troca o mês, e o gesto de voltar do iOS (a partir da borda esquerda) continua
      voltando de tela, sem trocar o mês.
- [ ] Rolar a tela na vertical nunca troca o mês.
- [ ] No Android, o gesto de voltar fecha a folha "Mais" antes de sair da tela.
- [ ] O "Nova" das categorias, na nova transação, abre a folha com o teclado no nome; com o teclado
  aberto, dá para rolar a folha até o "Criar e usar", e o voltar do Android fecha a folha.

**Toque e retorno**
- [ ] Nenhum realce cinza ao tocar em botões e links (iOS e Android).
- [ ] Toques respondem sem atraso de duplo toque.
- [ ] No Android, salvar uma transação vibra curto, uma vez, quando o servidor confirma. No iPhone,
      nada vibra e nada quebra.
- [ ] O confete de meta atingida e o check de salvo rodam lisos num aparelho mais simples.
- [ ] Com "Reduzir movimento" ligado (iOS: Acessibilidade > Movimento; Android: Remover animações), não
      há confete, as formas flutuantes ficam paradas e o check aparece pronto.

**Outros**
- [ ] O seletor de data nativo aparece em português.
- [ ] O app em tela cheia ("Adicionar à Tela de Início" no iOS) mantém as áreas seguras e a cor do tema.
