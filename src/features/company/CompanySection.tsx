import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useCompanies, useCreateCompany, useUnarchiveCompany } from "./companyApi";
import { CompanyForm } from "./CompanyForm";
import { regimeLabel } from "./regimeOptions";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { Card } from "../../shared/ui/Card";
import { PendingLabel } from "../../shared/ui/PendingLabel";

/** Em Minha conta: cadastrar empresa, ir para cada uma e desarquivar as arquivadas. */
export function CompanySection() {
  const companies = useCompanies(true);
  const [creating, setCreating] = useState(false);
  const active = companies.data?.filter((company) => !company.archived) ?? [];
  const archived = companies.data?.filter((company) => company.archived) ?? [];

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-base font-semibold">Minha empresa</h2>
      {active.length === 0 && (
        <p className="text-sm leading-relaxed text-text-soft">
          Tem CNPJ? Cadastre sua empresa para acompanhar notas, despesas e impostos separados das finanças pessoais.
        </p>
      )}
      {active.length > 0 && (
        <ul className="flex flex-col gap-1">
          {active.map((company) => (
            <li key={company.id}>
              <Link
                to={`/companies/${company.id}`}
                className="flex min-h-13 items-center gap-3 rounded-2xl px-2 transition active:bg-sunken"
              >
                <span aria-hidden="true" className="text-2xl">{company.emoji}</span>
                <span className="flex flex-col">
                  <span className="font-bold">{company.name}</span>
                  <span className="text-xs text-text-muted">{regimeLabel(company.currentRegime)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="-my-1 flex min-h-11 items-center self-start text-sm font-bold text-link"
      >
        Cadastrar empresa
      </button>
      {archived.length > 0 && <ArchivedCompanies companies={archived} />}
      {creating && <NewCompanySheet onClose={() => setCreating(false)} />}
    </Card>
  );
}

function ArchivedCompanies({ companies }: { companies: { id: number; name: string; emoji: string }[] }) {
  const unarchive = useUnarchiveCompany();
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-3">
      <h3 className="text-sm font-semibold text-text-muted">Arquivadas</h3>
      <ul className="flex flex-col">
        {companies.map((company) => (
          <li key={company.id} className="flex min-h-12 items-center gap-3">
            <span aria-hidden="true" className="text-xl opacity-60">{company.emoji}</span>
            <Link to={`/companies/${company.id}`} className="flex-1 text-sm font-semibold text-text-soft">
              {company.name}
            </Link>
            <button
              type="button"
              disabled={unarchive.isPending}
              onClick={() => unarchive.mutate(company.id)}
              aria-label={`Desarquivar ${company.name}`}
              className="flex min-h-11 items-center px-2 text-sm font-bold text-link disabled:opacity-60"
            >
              <PendingLabel pending={unarchive.isPending && unarchive.variables === company.id} pendingText="…">
                Desarquivar
              </PendingLabel>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewCompanySheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const create = useCreateCompany();
  return (
    <BottomSheet title="Cadastrar empresa" open onClose={onClose}>
      <CompanyForm
        mode="create"
        pending={create.isPending}
        error={create.error}
        onSubmit={(company) =>
          create.mutate(company, {
            onSuccess: (created) => {
              onClose();
              navigate(`/companies/${created.id}`);
            },
          })
        }
      />
    </BottomSheet>
  );
}
