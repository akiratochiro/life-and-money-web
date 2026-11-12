// Auditoria de celular: o Chrome emula um iPhone 13 (390x844, DPR 3, toque) e confere, em cada
// tela, alvos de toque, fonte dos campos e rolagem horizontal; depois executa os gestos com
// toques reais pelo protocolo do Chrome. Sai com erro se algo falhar.
//
// Uso (com o front servido e a API no ar; ver docs/mobile.md):
//   AUDIT_EMAIL=... AUDIT_PASSWORD=... npm run audit:mobile
import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const out = process.argv[2] ?? "mobile-audit";
const { AUDIT_EMAIL, AUDIT_PASSWORD } = process.env;
if (!AUDIT_EMAIL || !AUDIT_PASSWORD) {
  console.error("Defina AUDIT_EMAIL e AUDIT_PASSWORD de um usuário de teste do banco local.");
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const BASE = process.env.AUDIT_BASE ?? "http://localhost:4173";
const IPHONE_13 = {
  viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};
const report = { pages: {}, gestures: {} };
const log = (...args) => console.log(...args);

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
});
const page = await browser.newPage();
await page.setUserAgent(IPHONE_13.userAgent);
await page.setViewport(IPHONE_13.viewport);
const requests = [];
page.on("request", (request) => request.url().includes("/api/") && requests.push(request.url()));
const settle = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));

/** Tudo o que se toca na tela, com o tamanho real; texto corrido dentro de parágrafo é exceção da WCAG. */
async function audit(name) {
  await settle(2500);
  const data = await page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const describe = (el) =>
      (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
    // Um rádio escondido vale pelo <label> que o envolve, que é o que o dedo toca.
    const targets = [...document.querySelectorAll("a[href], button, input:not([type=radio]):not([type=checkbox]), select, textarea, [role=button], label:has(input[type=radio]), label:has(input[type=checkbox])")]
      .filter(visible)
      .filter((el) => !el.closest("[aria-hidden=true]"))
      .filter((el) => !(el.tagName === "A" && el.closest("p")));
    const small = targets
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ el, r }) => `${describe(el)} (${Math.round(r.width)}×${Math.round(r.height)})`);
    const fields = [...document.querySelectorAll("input:not([type=radio]):not([type=checkbox]), select, textarea")]
      .filter(visible)
      .map((el) => ({ name: describe(el.labels?.[0] ?? el), size: parseFloat(getComputedStyle(el).fontSize) }))
      .filter((field) => field.size < 16)
      .map((field) => `${field.name} (${field.size}px)`);
    const hoverRules = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      const walk = (list) => {
        for (const rule of list) {
          if (rule.cssRules) walk(rule.cssRules);
          if (rule.selectorText?.includes(":hover") && /(display|visibility|opacity)\s*:/.test(rule.cssText)) {
            hoverRules.push(rule.selectorText.slice(0, 60));
          }
        }
      };
      walk(rules);
    }
    return {
      pointerCoarse: matchMedia("(pointer: coarse)").matches,
      hoverNone: matchMedia("(hover: none)").matches,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      targets: targets.length,
      small,
      fields,
      hoverRules: [...new Set(hoverRules)],
      url: location.pathname,
    };
  });
  await page.screenshot({ path: `${out}/${name}.png` });
  report.pages[name] = data;
  log(`${name}: ${data.targets} alvos, ${data.small.length} pequenos, ${data.fields.length} campos < 16px, overflow ${data.overflowX}px`);
}

/** Um toque de verdade pelo protocolo do Chrome (não um evento sintético do JS). */
async function touch(from, to, steps = 8) {
  const client = await page.createCDPSession();
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from[0], y: from[1] }] });
  for (let i = 1; i <= steps; i++) {
    const x = from[0] + ((to[0] - from[0]) * i) / steps;
    const y = from[1] + ((to[1] - from[1]) * i) / steps;
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await settle(16);
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

const monthLabel = () => page.$eval('[aria-live="polite"]', (el) => el.textContent);

// Login com um usuário de teste do banco local.
// Telas públicas, antes de entrar.
for (const [name, path] of [["cadastro", "/register"], ["privacidade", "/privacy"]]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  await audit(name);
}

await page.goto(`${BASE}/login`, { waitUntil: "load" });
await audit("login");
await page.type("input[type=email]", AUDIT_EMAIL);
await page.type("input[type=password]", AUDIT_PASSWORD);
await page.tap("button[type=submit]");
await page.waitForFunction(() => location.pathname === "/", { timeout: 20000 });

for (const [name, path] of [
  ["inicio", "/"], ["extrato", "/transactions"], ["orcamento", "/budget"], ["metas", "/goals"],
  ["contas", "/bills"], ["calendario", "/calendar"], ["analises", "/analytics"], ["categorias", "/categories"], ["conta", "/account"],
]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  await audit(name);
}

// Minha Empresa: o cadastro (folha em Minha conta) e a página da primeira empresa, se houver.
await page.goto(`${BASE}/account`, { waitUntil: "load" });
await settle(1500);
const [newCompany] = await page.$$("xpath/.//button[normalize-space()='Cadastrar empresa']");
if (newCompany) {
  await newCompany.tap();
  await audit("cadastro-empresa");
  await page.keyboard.press("Escape");
}
const companyHref = await page.evaluate(() => document.querySelector('a[href^="/companies/"]')?.getAttribute("href"));
if (companyHref) {
  await page.goto(`${BASE}${companyHref}`, { waitUntil: "load" });
  await audit("empresa");
  // O caixa da empresa com o saldo e a reserva abertos: o detalhe tem o link para os vencidos.
  for (const label of ["Saldo na conta", "Reserva de impostos"]) {
    const [toggle] = await page.$$(`xpath/.//button[contains(normalize-space(), '${label}')]`);
    if (toggle) await toggle.tap();
  }
  await settle();
  await audit("empresa-caixa");
  // O faturamento esperado aberto no card do Fator R (só no Simples com Fator R).
  const [expected] = await page.$$("xpath/.//button[contains(@aria-label, 'faturamento esperado')]");
  if (expected) {
    await expected.tap();
    await settle();
    await audit("empresa-fator-r");
  }
  await page.goto(`${BASE}${companyHref}/invoices`, { waitUntil: "load" });
  await audit("notas");
  await page.goto(`${BASE}${companyHref}/expenses`, { waitUntil: "load" });
  await audit("despesas");
  await page.goto(`${BASE}${companyHref}/taxes`, { waitUntil: "load" });
  await audit("impostos");
  for (const [label, name] of [["Obrigações", "obrigacoes"], ["Calculadora de pró-labore", "calculadora"]]) {
    const [button] = await page.$$(`xpath/.//button[normalize-space()='${label}']`);
    if (button) {
      await button.tap();
      await audit(name);
      await page.keyboard.press("Escape");
      await settle();
    }
  }
  await page.goto(`${BASE}${companyHref}/calendar`, { waitUntil: "load" });
  await audit("empresa-calendario");
  await page.goto(`${BASE}${companyHref}/accountant`, { waitUntil: "load" });
  await audit("empresa-contador");
  await page.goto(`${BASE}${companyHref}/withdrawals`, { waitUntil: "load" });
  await audit("retiradas");
  const [newWithdrawal] = await page.$$("xpath/.//button[normalize-space()='Registrar retirada']");
  if (newWithdrawal) {
    await newWithdrawal.tap();
    await audit("nova-retirada");
    await page.keyboard.press("Escape");
    await settle();
  }
}

// Swipe lateral no Extrato.
await page.goto(`${BASE}/transactions`, { waitUntil: "load" });
await settle();
const before = await monthLabel();
await touch([300, 520], [90, 530]);
await settle();
const afterLeft = await monthLabel();
await touch([90, 520], [300, 515]);
await settle();
const afterRight = await monthLabel();
await touch([200, 700], [180, 350]); // rolagem vertical: não pode trocar de mês
await settle();
const afterScroll = await monthLabel();
report.gestures.swipe = { before, afterLeft, afterRight, afterScroll };
log("swipe:", report.gestures.swipe);

// Puxar para atualizar na Início.
await page.goto(`${BASE}/`, { waitUntil: "load" });
await settle();
requests.length = 0;
await touch([195, 260], [195, 560], 12);
await settle(1500);
report.gestures.pull = { requestsAfterPull: requests.length, sample: requests.slice(0, 4).map((url) => url.replace(BASE, "")) };
log("pull:", report.gestures.pull);
requests.length = 0;
await touch([195, 260], [195, 330], 6); // puxão curto
await settle(1200);
report.gestures.shortPull = { requestsAfterShortPull: requests.length };
log("short pull:", report.gestures.shortPull);

// "Mais" abre a bottom sheet.
await page.tap('nav button[aria-haspopup="dialog"]');
await settle(500);
report.gestures.more = await page.evaluate(() => {
  const dialog = document.querySelector("dialog[open]");
  return { open: !!dialog, links: dialog ? [...dialog.querySelectorAll("a")].map((a) => a.textContent.trim()) : [] };
});
await page.screenshot({ path: `${out}/mais.png` });
log("mais:", report.gestures.more);
await page.keyboard.press("Escape");
await settle(300);

// "+" leva à nova transação em tela cheia, com foco no valor.
await page.tap('nav a[aria-label="Nova transação"]');
await page.waitForFunction(() => location.pathname === "/transactions/new");
await settle(800);
report.gestures.newTransaction = await page.evaluate(() => ({
  focused: document.activeElement?.labels?.[0]?.textContent?.trim() ?? document.activeElement?.tagName,
  inputMode: document.activeElement?.getAttribute("inputmode"),
  bottomNavVisible: !!document.querySelector('nav button[aria-haspopup="dialog"]'),
}));
log("nova transação:", report.gestures.newTransaction);
await audit("nova-transacao");

writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close();

// O que conta como falha.
const failures = [];
for (const [name, data] of Object.entries(report.pages)) {
  if (data.small.length) failures.push(`${name}: alvos menores que 44 px: ${data.small.join("; ")}`);
  if (data.fields.length) failures.push(`${name}: campos com menos de 16 px (zoom no iOS): ${data.fields.join("; ")}`);
  if (data.overflowX > 0) failures.push(`${name}: rolagem horizontal de ${data.overflowX} px`);
  if (data.hoverRules.length) failures.push(`${name}: conteúdo que depende de hover: ${data.hoverRules.join("; ")}`);
}
const { swipe, pull, shortPull, more, newTransaction } = report.gestures;
if (swipe.afterLeft === swipe.before) failures.push("swipe para a esquerda não trocou de mês");
if (swipe.afterRight !== swipe.before) failures.push("swipe para a direita não voltou o mês");
if (swipe.afterScroll !== swipe.afterRight) failures.push("rolar a tela trocou de mês");
if (pull.requestsAfterPull === 0) failures.push("puxar para atualizar não recarregou nada");
if (shortPull.requestsAfterShortPull > 0) failures.push("um puxão curto recarregou");
if (!more.open) failures.push("o Mais não abriu a bottom sheet");
if (newTransaction.focused !== "Valor" || newTransaction.inputMode !== "decimal") failures.push("a nova transação não abriu com foco no valor e teclado decimal");
if (newTransaction.bottomNavVisible) failures.push("a nova transação não está em tela cheia");

if (failures.length) {
  console.error(`\n${failures.length} problema(s):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`\nTudo certo. Capturas e relatório em ${out}/`);
