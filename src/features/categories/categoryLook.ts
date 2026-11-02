import type { components } from "../../shared/api/schema";

export type CategoryColor = components["schemas"]["CategoryResponse"]["color"];
export type CategoryIcon = components["schemas"]["CategoryResponse"]["icon"];
type CategoryType = components["schemas"]["CategoryResponse"]["type"];

/** O mesmo padrão que a API aplica quando a categoria vem sem cor ou ícone. */
export const DEFAULT_LOOK: Record<CategoryType, { color: CategoryColor; icon: CategoryIcon }> = {
  INCOME: { color: "MINT", icon: "COIN" },
  EXPENSE: { color: "CORAL", icon: "OTHER" },
  SAVING: { color: "PINK", icon: "PIGGY_BANK" },
};

/**
 * Como cada cor da API aparece. As classes são literais de propósito: o Tailwind só gera o que
 * encontra escrito no código. O Record obriga a ter uma entrada para cada valor que a API
 * conhece: uma cor nova no OpenAPI quebra o build aqui até ganhar desenho.
 */
export const CATEGORY_COLORS: Record<CategoryColor, { label: string; fill: string; tile: string; swatch: string }> = {
  ROSE: { label: "Rosa", fill: "var(--color-cat-rose)", tile: "bg-cat-rose-soft text-cat-rose-ink", swatch: "bg-cat-rose" },
  PINK: { label: "Rosa-porquinho", fill: "var(--color-cat-pink)", tile: "bg-cat-pink-soft text-cat-pink-ink", swatch: "bg-cat-pink" },
  PEACH: { label: "Pêssego", fill: "var(--color-cat-peach)", tile: "bg-cat-peach-soft text-cat-peach-ink", swatch: "bg-cat-peach" },
  CORAL: { label: "Coral", fill: "var(--color-cat-coral)", tile: "bg-cat-coral-soft text-cat-coral-ink", swatch: "bg-cat-coral" },
  AMBER: { label: "Âmbar", fill: "var(--color-cat-amber)", tile: "bg-cat-amber-soft text-cat-amber-ink", swatch: "bg-cat-amber" },
  LIME: { label: "Limão", fill: "var(--color-cat-lime)", tile: "bg-cat-lime-soft text-cat-lime-ink", swatch: "bg-cat-lime" },
  MINT: { label: "Menta", fill: "var(--color-cat-mint)", tile: "bg-cat-mint-soft text-cat-mint-ink", swatch: "bg-cat-mint" },
  TEAL: { label: "Verde-água", fill: "var(--color-cat-teal)", tile: "bg-cat-teal-soft text-cat-teal-ink", swatch: "bg-cat-teal" },
  SKY: { label: "Céu", fill: "var(--color-cat-sky)", tile: "bg-cat-sky-soft text-cat-sky-ink", swatch: "bg-cat-sky" },
  LAVENDER: { label: "Lavanda", fill: "var(--color-cat-lavender)", tile: "bg-cat-lavender-soft text-cat-lavender-ink", swatch: "bg-cat-lavender" },
  PLUM: { label: "Ameixa", fill: "var(--color-cat-plum)", tile: "bg-cat-plum-soft text-cat-plum-ink", swatch: "bg-cat-plum" },
  SAND: { label: "Areia", fill: "var(--color-cat-sand)", tile: "bg-cat-sand-soft text-cat-sand-ink", swatch: "bg-cat-sand" },
};

export const CATEGORY_ICONS: Record<CategoryIcon, string> = {
  HOME: "Casa",
  CART: "Mercado",
  FOOD: "Comida",
  TRANSPORT: "Transporte",
  CAR: "Carro",
  HEALTH: "Saúde",
  EDUCATION: "Educação",
  LEISURE: "Lazer",
  TRAVEL: "Viagem",
  PET: "Pet",
  CLOTHES: "Roupas",
  BILLS: "Contas",
  PHONE: "Celular",
  GIFT: "Presente",
  SALARY: "Salário",
  INVESTMENT: "Investimento",
  PIGGY_BANK: "Cofrinho",
  COIN: "Moeda",
  HEART: "Coração",
  OTHER: "Outros",
};

export const COLOR_ORDER = Object.keys(CATEGORY_COLORS) as CategoryColor[];
export const ICON_ORDER = Object.keys(CATEGORY_ICONS) as CategoryIcon[];
