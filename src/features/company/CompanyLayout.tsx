import { useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router";
import { useArchiveCompany, useCompany, useUnarchiveCompany, useUpdateCompany, type Company } from "./companyApi";
import { CompanyForm } from "./CompanyForm";
import { CompanySkeleton } from "./CompanySkeleton";
import { regimeLabel } from "./regimeOptions";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { Badge } from "../../shared/ui/Badge";
import { EmptyState } from "../../shared/ui/EmptyState";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { ApiError } from "../../shared/api/problem";

/**
 * As abas aparecem quando a fase de cada uma fica pronta (decisão 24): aba que não faz nada é
 * ruído. Com uma aba só, a barra nem aparece.
 */
const TABS = [
  { to: "", label: "Visão geral" },
  { to: "invoices", label: "Notas fiscais" },
  { to: "expenses", label: "Despesas" },
];

export function CompanyLayout() {
  const companyId = Number(useParams().companyId);
  const company = useCompany(companyId);
  const [editing, setEditing] = useState(false);

  if (company.isPending) return <CompanySkeleton />;
  if (company.isError) {
    const notFound = company.error instanceof ApiError && company.error.status === 404;
    return (
      <EmptyState action={<Link to="/account" className="font-bold text-link">Ir para Minha conta</Link>}>
        {notFound ? "Empresa não encontrada." : company.error.message}
      </EmptyState>
    );
  }

  const data = company.data;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface text-3xl shadow-clay-sm">
          {data.emoji}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-2xl font-semibold">{data.name}</h1>
            {data.archived && <Badge tone="warning">Arquivada</Badge>}
          </div>
          <p className="text-sm text-text-soft">{regimeLabel(data.currentRegime)}</p>
        </div>
        {!data.archived && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-link"
          >
            Editar
          </button>
        )}
      </header>

      {TABS.length > 1 && (
        <nav aria-label="Seções da empresa" className="flex gap-1 overflow-x-auto rounded-full bg-sunken p-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === ""}
              className={({ isActive }) =>
                `flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-bold ${
                  isActive ? "bg-surface text-text shadow-clay-sm" : "text-text-muted"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}

      <Outlet context={data} />

      {/* key: abrir de novo começa com os dados atuais, e não com um rascunho descartado. */}
      {editing && <EditCompanySheet key={data.id} company={data} onClose={() => setEditing(false)} />}
    </div>
  );
}

function EditCompanySheet({ company, onClose }: { company: Company; onClose: () => void }) {
  const update = useUpdateCompany(company.id);
  const archive = useArchiveCompany();

  return (
    <BottomSheet title="Editar empresa" open onClose={onClose}>
      <CompanyForm
        mode="edit"
        company={company}
        pending={update.isPending}
        error={update.error}
        onSubmit={(changes) => update.mutate(changes, { onSuccess: onClose })}
        footer={
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm text-text-muted">
              Arquivar tira a empresa do menu e impede alterações. Todo o histórico fica guardado, e dá para desarquivar
              em Minha conta.
            </p>
            <button
              type="button"
              disabled={archive.isPending}
              onClick={() => archive.mutate(company.id, { onSuccess: onClose })}
              className="flex min-h-11 items-center self-start text-sm font-bold text-danger-strong disabled:opacity-60"
            >
              <PendingLabel pending={archive.isPending} pendingText="Arquivando…">Arquivar empresa</PendingLabel>
            </button>
          </div>
        }
      />
    </BottomSheet>
  );
}

/** O aviso de empresa arquivada, com o desarquivar ali mesmo. */
export function ArchivedNotice({ company }: { company: Company }) {
  const unarchive = useUnarchiveCompany();
  return (
    <div role="note" className="flex flex-col gap-2 rounded-2xl bg-warning-soft p-4 text-sm text-warning-strong">
      <p className="font-semibold">Esta empresa está arquivada: dá para consultar, mas não alterar.</p>
      <button
        type="button"
        disabled={unarchive.isPending}
        onClick={() => unarchive.mutate(company.id)}
        className="flex min-h-11 items-center self-start font-bold underline disabled:opacity-60"
      >
        <PendingLabel pending={unarchive.isPending} pendingText="Desarquivando…">Desarquivar</PendingLabel>
      </button>
    </div>
  );
}
