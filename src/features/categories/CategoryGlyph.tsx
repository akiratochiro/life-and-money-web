import type { ReactElement, SVGProps } from "react";
import { CATEGORY_COLORS, type CategoryColor, type CategoryIcon } from "./categoryLook";

type IconProps = SVGProps<SVGSVGElement>;

/** Mesmo traço dos ícones do app (24 px, linha de 1,9, pontas arredondadas). */
function Line({ children, ...props }: IconProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

const DRAWINGS: Record<CategoryIcon, (props: IconProps) => ReactElement> = {
  HOME: (p) => <Line {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></Line>,
  CART: (p) => <Line {...p}><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 1.9-1.5L20 8H6.2" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></Line>,
  FOOD: (p) => <Line {...p}><path d="M6 3v6a3 3 0 0 0 6 0V3" /><path d="M9 3v18" /><path d="M17 3c-2 2-2.5 6 0 8v10" /></Line>,
  TRANSPORT: (p) => <Line {...p}><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14" /><path d="M8 20v-3M16 20v-3" /></Line>,
  CAR: (p) => <Line {...p}><path d="M5 15v-3l2-5h10l2 5v3" /><path d="M3 15h18v3H3z" /><circle cx="7.5" cy="18.5" r="1.5" /><circle cx="16.5" cy="18.5" r="1.5" /></Line>,
  HEALTH: (p) => <Line {...p}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></Line>,
  EDUCATION: (p) => <Line {...p}><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></Line>,
  LEISURE: (p) => <Line {...p}><path d="M7 8h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.2 2L14 13h-4l-1.8 2A3 3 0 0 1 3 13v-1a4 4 0 0 1 4-4z" /><path d="M8 10.5v3M6.5 12h3" /><circle cx="16" cy="12" r="0.8" /></Line>,
  TRAVEL: (p) => <Line {...p}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></Line>,
  PET: (p) => <Line {...p}><circle cx="8" cy="7.5" r="1.8" /><circle cx="16" cy="7.5" r="1.8" /><circle cx="5" cy="12.5" r="1.8" /><circle cx="19" cy="12.5" r="1.8" /><path d="M12 12c-3 0-5 3-5 5.2 0 1.5 1 2.3 2.5 2.3 1 0 1.7-.6 2.5-.6s1.5.6 2.5.6c1.5 0 2.5-.8 2.5-2.3 0-2.2-2-5.2-5-5.2z" /></Line>,
  CLOTHES: (p) => <Line {...p}><path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z" /></Line>,
  BILLS: (p) => <Line {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></Line>,
  PHONE: (p) => <Line {...p}><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></Line>,
  GIFT: (p) => <Line {...p}><rect x="3" y="8" width="18" height="5" rx="1" /><path d="M5 13v8h14v-8M12 8v13" /><path d="M12 8C10.5 4.5 7 4.5 7.5 6.8 8 8 12 8 12 8zM12 8c1.5-3.5 5-3.5 4.5-1.2C16 8 12 8 12 8z" /></Line>,
  SALARY: (p) => <Line {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></Line>,
  INVESTMENT: (p) => <Line {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></Line>,
  PIGGY_BANK: (p) => <Line {...p}><path d="M4.5 12.5a7 6 0 0 1 12.2-4H19l1 3v3h-2a7 6 0 0 1-3 2.8V20h-3v-1.6h-2V20H7v-2.5a6 6 0 0 1-2.5-5z" /><path d="M10 6.5h3" /><circle cx="15.5" cy="11" r="0.7" /></Line>,
  COIN: (p) => <Line {...p}><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5V8M12 16v1.5" /></Line>,
  HEART: (p) => <Line {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></Line>,
  OTHER: (p) => <Line {...p}><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.3" /></Line>,
};

export function CategoryGlyph({ icon, ...props }: { icon: CategoryIcon } & IconProps) {
  const Drawing = DRAWINGS[icon];
  return <Drawing {...props} />;
}

/** O ladrilho da categoria: fundo suave da cor dela, ícone na tinta da mesma cor. */
export function CategoryTile({
  color,
  icon,
  size = "md",
}: {
  color: CategoryColor;
  icon: CategoryIcon;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-7 w-7 rounded-xl" : "h-10 w-10 rounded-2xl";
  return (
    <span className={`flex shrink-0 items-center justify-center shadow-clay-sm ${box} ${CATEGORY_COLORS[color].tile}`}>
      <CategoryGlyph icon={icon} width={size === "sm" ? 16 : 22} height={size === "sm" ? 16 : 22} />
    </span>
  );
}

