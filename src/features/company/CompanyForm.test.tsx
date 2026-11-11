import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyForm, OPENING_DATE_LOCKED, OPENING_DATE_RULE } from "./CompanyForm";
import type { Company, CompanyUpdate, NewCompany } from "./companyApi";
import { ApiError } from "../../shared/api/problem";

const mocks = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

const ok = (data: unknown) => Promise.resolve({ data, response: new Response(null, { status: 200 }) });

function renderForm(ui: React.ReactElement) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{ui}</QueryClientProvider>,
  );
}

function createForm(error: Error | null = null) {
  const onSubmit = vi.fn<(company: NewCompany) => void>();
  renderForm(<CompanyForm mode="create" pending={false} error={error} onSubmit={onSubmit} />);
  return onSubmit;
}

const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement;

beforeEach(() => {
  mocks.GET.mockReset();
});

describe("cadastro de empresa", () => {
  it("escolher MEI trava o regime no SIMEI e pede a atividade, sem anexo", async () => {
    createForm();

    await userEvent.selectOptions(select("Natureza jurídica"), "MEI");

    expect(select("Regime tributário")).toHaveValue("SIMEI");
    expect(select("Regime tributário")).toBeDisabled();
    expect(screen.getByText("O MEI é sempre tributado pelo SIMEI.")).toBeInTheDocument();
    expect(screen.getByLabelText("Atividade do MEI")).toBeInTheDocument();
    expect(screen.queryByLabelText("Como o Anexo é definido")).not.toBeInTheDocument();
  });

  it("no Simples, pede o anexo e explica o Fator R e o Anexo IV", async () => {
    createForm();

    await userEvent.selectOptions(select("Natureza jurídica"), "SLU");
    await userEvent.selectOptions(select("Regime tributário"), "SIMPLES_NACIONAL");

    expect(screen.getByLabelText("Como o Anexo é definido")).toBeInTheDocument();
    expect(screen.getByText(/o chamado Fator R/)).toBeInTheDocument();
    expect(screen.getByText(/Anexo IV/)).toBeInTheDocument();
  });

  it("no Lucro Presumido, avisa que os impostos são lançados à mão", async () => {
    createForm();

    await userEvent.selectOptions(select("Natureza jurídica"), "LTDA");
    await userEvent.selectOptions(select("Regime tributário"), "LUCRO_PRESUMIDO");

    expect(screen.getByRole("note")).toHaveTextContent("o app não calcula os impostos");
  });

  it("avisa até quando a data de abertura pode ser corrigida", () => {
    createForm();

    expect(screen.getByLabelText("Data de abertura")).toHaveAccessibleDescription(OPENING_DATE_RULE);
  });

  it("só envia com o enquadramento completo, sem os campos que não se aplicam", async () => {
    const onSubmit = createForm();
    await userEvent.type(screen.getByLabelText("Nome da empresa"), "Ana Design");
    await userEvent.type(screen.getByLabelText("Data de abertura"), "2024-03-10");
    await userEvent.selectOptions(select("Natureza jurídica"), "MEI");
    const submit = screen.getByRole("button", { name: "Cadastrar empresa" });
    expect(submit).toBeDisabled();

    await userEvent.selectOptions(select("Atividade do MEI"), "SERVICOS");
    await userEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ana Design",
        emoji: "💼",
        cnpj: undefined,
        openingDate: "2024-03-10",
        legalNature: "MEI",
        taxRegime: "SIMEI",
        annexConfig: undefined,
        meiActivity: "SERVICOS",
        openingBalance: 0,
        partnerName: undefined,
      }),
    );
  });

  it("a busca pelo CNPJ preenche só o que está em branco e manda o CNPJ sem pontuação", async () => {
    mocks.GET.mockReturnValue(
      ok({ available: true, found: true, name: "ANA SOUZA", tradeName: "Ana Design", openingDate: "2024-03-10", legalNature: "MEI" }),
    );
    createForm();
    await userEvent.type(screen.getByLabelText("Data de abertura"), "2023-01-02");
    await userEvent.type(screen.getByLabelText("CNPJ"), "12.abc.345/01de-35");

    await userEvent.click(screen.getByRole("button", { name: "Buscar dados pelo CNPJ" }));

    expect(mocks.GET).toHaveBeenCalledWith("/cnpj/{cnpj}", { params: { path: { cnpj: "12ABC34501DE35" } } });
    expect(await screen.findByLabelText("Nome da empresa")).toHaveValue("Ana Design");
    expect(screen.getByLabelText("Data de abertura")).toHaveValue("2023-01-02");
    expect(select("Natureza jurídica")).toHaveValue("MEI");
    expect(screen.getByRole("status")).toHaveTextContent("Confira antes de salvar");
  });

  it("com a consulta fora do ar, o formulário segue à mão", async () => {
    mocks.GET.mockReturnValue(ok({ available: false, found: false }));
    createForm();
    await userEvent.type(screen.getByLabelText("CNPJ"), "11222333000181");

    await userEvent.click(screen.getByRole("button", { name: "Buscar dados pelo CNPJ" }));

    expect(await screen.findByRole("status")).toHaveTextContent("fora do ar");
    expect(screen.getByLabelText("Nome da empresa")).toBeEnabled();
  });

  it("um CNPJ desconhecido avisa que os CNPJs com letras podem não aparecer", async () => {
    mocks.GET.mockReturnValue(ok({ available: true, found: false }));
    createForm();
    await userEvent.type(screen.getByLabelText("CNPJ"), "12ABC34501DE35");

    await userEvent.click(screen.getByRole("button", { name: "Buscar dados pelo CNPJ" }));

    expect(await screen.findByRole("status")).toHaveTextContent("CNPJs com letras podem ainda não aparecer");
  });

  it("o erro da API aparece no campo dele", () => {
    createForm(new ApiError(400, { detail: "Confira os campos", errors: { openingDate: "A data de abertura não pode estar no futuro." } }));

    expect(screen.getByLabelText("Data de abertura")).toHaveAccessibleDescription("A data de abertura não pode estar no futuro.");
    expect(screen.getByLabelText("Data de abertura")).toBeInvalid();
  });
});

describe("edição de empresa", () => {
  const company = {
    id: 7,
    name: "Ana Design",
    emoji: "🎨",
    cnpj: "12ABC34501DE35",
    openingDate: "2024-03-10",
    openingDateEditable: false,
    revenueBasis: "COMPETENCIA",
    fatorRTarget: 0.28,
    openingBalance: -150.25,
    openingBalanceDate: "2025-01-01",
    currentRegime: { id: 1, legalNature: "MEI", taxRegime: "SIMEI", meiActivity: "SERVICOS", validFrom: "2024-03" },
    archived: false,
    createdAt: "",
  } as Company;

  function editForm(overrides: Partial<Company> = {}) {
    const onSubmit = vi.fn<(changes: CompanyUpdate) => void>();
    renderForm(<CompanyForm mode="edit" company={{ ...company, ...overrides }} pending={false} error={null} onSubmit={onSubmit} />);
    return onSubmit;
  }

  it("não mostra o enquadramento, que muda por outra folha", () => {
    editForm();

    expect(screen.queryByLabelText("Natureza jurídica")).not.toBeInTheDocument();
  });

  it("com a data travada, o campo fica desabilitado e explica o motivo", () => {
    editForm();

    expect(screen.getByLabelText("Data de abertura")).toBeDisabled();
    expect(screen.getByLabelText("Data de abertura")).toHaveAccessibleDescription(OPENING_DATE_LOCKED);
  });

  it("começa com os dados atuais, inclusive o saldo negativo, e envia a meta como fração", async () => {
    const onSubmit = editForm({ openingDateEditable: true });

    expect(screen.getByLabelText("CNPJ")).toHaveValue("12.ABC.345/01DE-35");
    expect(screen.getByLabelText("A conta estava no vermelho")).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Ana Design",
      emoji: "🎨",
      cnpj: "12ABC34501DE35",
      openingDate: "2024-03-10",
      fatorRTarget: 0.28,
      openingBalance: -150.25,
      openingBalanceDate: "2025-01-01",
    });
  });

  it("apagar o CNPJ manda texto vazio, que a API entende como remover", async () => {
    const onSubmit = editForm();
    await userEvent.clear(screen.getByLabelText("CNPJ"));

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ cnpj: "", openingDate: undefined }));
  });
});
