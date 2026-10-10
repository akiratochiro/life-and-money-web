import { NavLink, Outlet } from "react-router";
import { GaugeIcon, HomeIcon, ListIcon, PlusIcon, TargetIcon } from "../shared/ui/icons";

const items = [
  { to: "/", label: "Início", icon: HomeIcon },
  { to: "/transactions", label: "Extrato", icon: ListIcon },
  { to: "/budget", label: "Orçamento", icon: GaugeIcon },
  { to: "/goals", label: "Metas", icon: TargetIcon },
];

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "text-signal" : "text-text-muted hover:text-text";
}

export function AppShell() {
  return (
    <div className="min-h-dvh bg-ink-900 lg:flex">
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:gap-2 lg:border-r lg:border-line lg:px-5 lg:py-8">
        <p className="mb-6 px-3 font-display text-xs font-semibold uppercase tracking-[0.25em] text-signal">
          Life and Money
        </p>
        <nav aria-label="Navegação principal" className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={(state) =>
                `flex h-12 items-center gap-3 rounded-2xl px-3 font-bold transition ${navClass(state)}`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/transactions/new"
          className="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-signal font-bold text-ink-900 transition active:scale-95"
        >
          <PlusIcon width={20} height={20} />
          Nova transação
        </NavLink>
      </aside>

      <main className="flex-1 px-5 pb-32 pt-7 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto w-full max-w-3xl">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 flex h-24 items-center justify-between border-t border-line bg-ink-900/95 px-3 pb-6 pt-2 backdrop-blur lg:hidden"
      >
        {items.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className={(state) => `flex w-16 flex-col items-center gap-1 text-[11px] font-bold ${navClass(state)}`}>
            <Icon />
            {label}
          </NavLink>
        ))}
        <NavLink
          to="/transactions/new"
          aria-label="Nova transação"
          className="-mt-8 flex h-16 w-16 items-center justify-center rounded-[22px] bg-signal text-ink-900 shadow-[0_14px_28px_-10px_rgb(255_122_31_/_0.7)] ring-[6px] ring-ink-900 transition active:scale-95"
        >
          <PlusIcon width={26} height={26} />
        </NavLink>
        {items.slice(2).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={(state) => `flex w-16 flex-col items-center gap-1 text-[11px] font-bold ${navClass(state)}`}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}