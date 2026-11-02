/// <reference types="node" />
// Os tipos do Node valem só neste arquivo: o teste lê o index.css do disco, e o app não usa Node.
// (Um import "?raw" não serve: o Vitest entrega arquivos .css vazios.)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR_ORDER } from "./features/categories/categoryLook";

/** O mesmo index.css que o app usa; o Vitest roda a partir da raiz do projeto. */
const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
const colors = new Map(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, hex]) => [name, hex]),
);

function color(name: string): string {
  const hex = colors.get(name);
  if (!hex) throw new Error(`--color-${name} não existe no index.css`);
  return hex;
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(color(a)), luminance(color(b))].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** WCAG AA para texto normal. */
const AA = 4.5;
const BACKGROUNDS = ["canvas", "surface", "surface-raised", "sunken"];
/** As cores que a API conhece (o tipo gerado obriga o categoryLook a ter todas). */
const CATEGORY_COLORS = COLOR_ORDER.map((color) => color.toLowerCase());

describe("contraste do tema", () => {
  it.each(["text", "text-soft", "text-muted", "link", "accent"])("o texto %s passa AA em todo fundo", (text) => {
    for (const background of BACKGROUNDS) {
      expect(contrast(text, background), `${text} sobre ${background}`).toBeGreaterThanOrEqual(AA);
    }
  });

  it.each(["income", "expense", "saving", "warning", "danger"])("o tom forte de %s passa AA no fundo e no próprio selo", (role) => {
    for (const background of [...BACKGROUNDS, `${role}-soft`]) {
      expect(contrast(`${role}-strong`, background), `${role}-strong sobre ${background}`).toBeGreaterThanOrEqual(AA);
    }
  });

  it("o texto dos botões passa AA no destaque e no perigo", () => {
    expect(contrast("on-accent", "accent")).toBeGreaterThanOrEqual(AA);
    expect(contrast("on-accent", "danger-strong")).toBeGreaterThanOrEqual(AA);
    expect(contrast("text", "warning")).toBeGreaterThanOrEqual(AA);
  });

  it.each(CATEGORY_COLORS)("a tinta da categoria %s passa AA no fundo suave dela e no card", (name) => {
    expect(contrast(`cat-${name}-ink`, `cat-${name}-soft`)).toBeGreaterThanOrEqual(AA);
    expect(contrast(`cat-${name}-ink`, "surface")).toBeGreaterThanOrEqual(AA);
  });

  it("tem as três cores de cada categoria que a API conhece", () => {
    for (const name of CATEGORY_COLORS) {
      for (const suffix of ["", "-soft", "-ink"]) expect(colors.has(`cat-${name}${suffix}`), `cat-${name}${suffix}`).toBe(true);
    }
  });
});
