import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { AnimatePresence, m } from "motion/react";
import { pageEnter } from "../shared/ui/motion";
import {
  CalendarIcon,
  ChartIcon,
  GaugeIcon,
  HomeIcon,
  ListIcon,
  MoreIcon,
  PlusIcon,
  TagIcon,
  TargetIcon,
  UserIcon,
} from "../shared/ui/icons";
import { Logo } from "../shared/brand/Logo";
import { BottomSheet } from "../shared/ui/BottomSheet";

const primary = [
  { to: "/", label: "Início", icon: HomeIcon },
  { to: "/transactions", label: "Extrato", icon: ListIcon },
  { to: "/budget", label: "Orçamento", icon: GaugeIcon },
  { to: "/goals", label: "Metas", icon: TargetIcon },
];

/** No celular, ficam no "Mais"; no desktop, na sidebar junto com as principais. */
const secondary = [
  { to: "/bills", label: "Contas", icon: CalendarIcon },
  { to: "/analytics", label: "Análises", icon: ChartIcon },
  { to: "/categories", label: "Categorias", icon: TagIcon },
  { to: "/account", label: "Minha conta", icon: UserIcon },
];

/** A nova transação é tela cheia no celular: sem a barra de baixo, que roubaria espaço do teclado. */
const FULL_SCREEN_ON_MOBILE = ["/transactions/new"];

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "text-accent" : "text-text-muted";
}

function sideItemClass(state: { isActive: boolean }) {
  return `flex h-12 items-center gap-3 rounded-2xl px-3 font-bold transition hover:text-text ${navClass(state)}`;
}

/**
 * Abaixo de md (768 px), uma barra de navegação na base, como num app nativo; a partir daí, a
 * sidebar. A barra e o topo respeitam as áreas seguras (notch e barra de gestos), já que o
 * viewport usa viewport-fit=cover.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const fullScreen = FULL_SCREEN_ON_MOBILE.includes(pathname);
  const onSecondary = secondary.some((item) => pathname.startsWith(item.to));

  return (
    <div className="min-h-dvh bg-canvas md:flex">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:gap-2 md:border-r md:border-line md:px-5 md:py-8 lg:w-64">
        <Logo className="mb-6 px-1" />
        <nav aria-label="Navegação principal" className="flex flex-col gap-1">
          {[...primary, ...secondary].map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className={sideItemClass}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/transactions/new"
          className="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent transition active:scale-95"
        >
          <PlusIcon width={20} height={20} />
          Nova transação
        </NavLink>
      </aside>

      <main
        className={`flex-1 px-gutter pt-[calc(1.75rem+env(safe-area-inset-top))] md:px-10 md:pb-12 md:pt-10 ${
          fullScreen ? "pb-[calc(1.5rem+env(safe-area-inset-bottom))]" : "pb-[calc(7.5rem+env(safe-area-inset-bottom))]"
        }`}
      >
        {/* Anima a entrada ao navegar, mas não na primeira abertura (initial={false}): ali a
            animação só atrasaria o LCP. Sem animação de saída, porque o <Outlet> da página que
            sai já renderizaria a página nova. */}
        <AnimatePresence initial={false}>
          <m.div key={pathname} {...pageEnter} className="mx-auto w-full max-w-3xl">
            <Outlet />
          </m.div>
        </AnimatePresence>
      </main>

      {!fullScreen && (
        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 items-end border-t border-line bg-canvas/95 px-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden"
        >
          {primary.slice(0, 2).map((item) => (
            <TabLink key={item.to} {...item} />
          ))}
          <NavLink
            to="/transactions/new"
            aria-label="Nova transação"
            className="mx-auto -mt-7 flex h-14 w-14 items-center justify-center rounded-[20px] bg-accent text-on-accent shadow-clay-accent ring-[5px] ring-canvas transition active:scale-95"
          >
            <PlusIcon width={26} height={26} />
          </NavLink>
          {primary.slice(2).map((item) => (
            <TabLink key={item.to} {...item} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10.5px] font-bold ${
              onSecondary ? "text-accent" : "text-text-muted"
            }`}
          >
            <MoreIcon />
            Mais
          </button>
        </nav>
      )}

      <BottomSheet title="Mais" open={moreOpen} onClose={() => setMoreOpen(false)}>
        <nav aria-label="Mais telas" className="flex flex-col">
          {secondary.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMoreOpen(false)}
              className={(state) =>
                `flex min-h-13 items-center gap-3 rounded-2xl px-3 font-bold transition active:bg-sunken ${navClass(state)}`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      </BottomSheet>
    </div>
  );
}

function TabLink({ to, label, icon: Icon }: { to: string; label: string; icon: (typeof primary)[number]["icon"] }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={(state) =>
        `flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10.5px] font-bold transition active:scale-95 ${navClass(state)}`
      }
    >
      <Icon />
      {label}
    </NavLink>
  );
}
