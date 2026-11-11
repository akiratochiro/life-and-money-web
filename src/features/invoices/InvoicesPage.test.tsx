import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { InvoicesPage } from "./InvoicesPage";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn(), PUT: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

const ok = (data: unknown, status = 200) => Promise.resolve({ data, response: new Response(null, { status }) });
const KEY = "3".repeat(50);
const YEAR = new Date().getFullYear();

function invoice(overrides: Record<string, unknown>) {
  return {
    id: 1, source: "XML", status: "ATIVA", number: "42", issueDate: `${YEAR}-10-31`, competenceDate: `${YEAR}-10-31`,
    serviceAmount: 10000, unconditionalDiscountAmount: 0, netAmount: 8450, issWithheldAmount: 200, irrfWithheldAmount: 150,
    pisWithheldAmount: 0, cofinsWithheldAmount: 0, csllWithheldAmount: 100, inssWithheldAmount: 1100,
    takerName: "Cliente Exemplo", ...overrides,
  };
}

function serve(invoices: unknown[] = []) {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/invoices/years") return ok(invoices.length ? [YEAR] : []);
    if (path === "/companies/{companyId}/invoices") return ok(invoices);
    if (path === "/attachments/usage") return ok({ usedBytes: 13_002_342, limitBytes: 52_428_800 });
    throw new Error(`GET inesperado: ${path}`);
  });
}

const COMPANY = { id: 7, archived: false };

function open(company = COMPANY) {
  const router = createMemoryRouter(
    [{ path: "/companies/:companyId", element: <Outlet context={company} />, children: [{ path: "invoices", element: <InvoicesPage /> }] }],
    { initialEntries: ["/companies/7/invoices"] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const xmlFile = () => new File(["<NFSe/>"], "nota.xml", { type: "application/xml" });
const pdfFile = () => new File(["%PDF-"], "nota.pdf", { type: "application/pdf" });
const badFile = () => new File(["MZ"], "virus.pdf", { type: "application/pdf" });

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
});

describe("envio de notas", () => {
  it("mostra a pré-visualização de cada arquivo: XML travado, PDF para conferir e recusado com o motivo", async () => {
    serve();
    mocks.POST.mockReturnValue(ok([
      { filename: "nota.xml", fileType: "XML", status: "READY", warnings: [], fields: invoice({}) },
      { filename: "nota.pdf", fileType: "PDF", status: "NEEDS_INPUT", message: "Confira os campos lidos do PDF.", warnings: [], fields: { accessKey: KEY } },
      { filename: "virus.pdf", status: "REJECTED", message: "O arquivo \"virus.pdf\" não é um XML ou PDF.", warnings: [] },
    ]));
    open();

    await userEvent.upload(await screen.findByLabelText("Arquivos das notas"), [xmlFile(), pdfFile(), badFile()]);

    const xml = await screen.findByRole("article", { name: "nota.xml" });
    expect(within(xml).getByText("Pronta")).toBeInTheDocument();
    expect(within(xml).getByText(/Lido do XML/)).toBeInTheDocument();
    expect(within(xml).queryByLabelText("Valor do serviço")).not.toBeInTheDocument();

    const pdf = screen.getByRole("article", { name: "nota.pdf" });
    expect(within(pdf).getByLabelText("Chave de acesso")).toHaveValue(KEY);
    expect(within(pdf).getByRole("button", { name: "Salvar nota" })).toBeDisabled();

    const bad = screen.getByRole("article", { name: "virus.pdf" });
    expect(within(bad).getByText("O arquivo \"virus.pdf\" não é um XML ou PDF.")).toBeInTheDocument();
    expect(within(bad).queryByRole("button", { name: "Salvar nota" })).not.toBeInTheDocument();
  });

  it("salvar uma nota do XML manda só o arquivo; a do PDF manda também os campos conferidos", async () => {
    serve();
    mocks.POST.mockImplementation((path: string) =>
      path === "/companies/{companyId}/invoices/parse"
        ? ok([
            { filename: "nota.xml", fileType: "XML", status: "READY", warnings: [], fields: invoice({}) },
            { filename: "nota.pdf", fileType: "PDF", status: "NEEDS_INPUT", warnings: [], fields: { accessKey: KEY } },
          ])
        : ok(invoice({ number: "99" }), 201),
    );
    open();
    await userEvent.upload(await screen.findByLabelText("Arquivos das notas"), [xmlFile(), pdfFile()]);

    const xml = await screen.findByRole("article", { name: "nota.xml" });
    await userEvent.click(within(xml).getByRole("button", { name: "Salvar nota" }));
    const xmlForm = mocks.POST.mock.calls[1][1].bodySerializer() as FormData;
    expect((xmlForm.get("file") as File).name).toBe("nota.xml");
    expect(xmlForm.get("data")).toBeNull();
    expect(await within(xml).findByText("Nota nº 99 salva.")).toBeInTheDocument();

    const pdf = screen.getByRole("article", { name: "nota.pdf" });
    await userEvent.type(within(pdf).getByLabelText("Número da nota"), "77");
    await userEvent.type(within(pdf).getByLabelText("Data de emissão"), `${YEAR}-01-05`);
    await userEvent.type(within(pdf).getByLabelText("Competência"), `${YEAR}-01-01`);
    await userEvent.type(within(pdf).getByLabelText("Valor do serviço"), "300000");
    await userEvent.click(within(pdf).getByRole("button", { name: "Salvar nota" }));

    const pdfForm = mocks.POST.mock.calls[2][1].bodySerializer() as FormData;
    const data = JSON.parse(await (pdfForm.get("data") as Blob).text());
    expect(data).toMatchObject({ number: "77", accessKey: KEY, serviceAmount: 3000, competenceDate: `${YEAR}-01-01` });
  });

  it("uma empresa arquivada não mostra o envio", async () => {
    serve();
    open({ id: 7, archived: true });

    expect(await screen.findByText(/Nenhuma nota com competência/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Escolher arquivos" })).not.toBeInTheDocument();
  });
});

describe("lista de notas", () => {
  it("agrupa por mês, com o total das ativas, a cancelada riscada e o uso da cota", async () => {
    serve([
      invoice({ id: 3, number: "44", competenceDate: `${YEAR}-11-02`, serviceAmount: 1000 }),
      invoice({ id: 4, number: "45", competenceDate: `${YEAR}-10-20`, serviceAmount: 2000 }),
      invoice({ id: 2, number: "43", serviceAmount: 10000, unconditionalDiscountAmount: 500 }),
      invoice({ id: 1, number: "42", competenceDate: `${YEAR}-10-15`, serviceAmount: 4000, status: "CANCELADA" }),
    ]);
    open();

    const october = await screen.findByRole("region", { name: `Outubro de ${YEAR}` });
    // 9.500 (10.000 menos o desconto) + 2.000; a cancelada de 4.000 fica fora.
    expect(within(october).getByText("R$ 11.500,00")).toBeInTheDocument();
    expect(within(october).getByText("Cancelada")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: `Novembro de ${YEAR}` })).toBeInTheDocument();
    expect(screen.getByText("12,4 MB de 50 MB usados com arquivos.")).toBeInTheDocument();
  });

  it("o detalhe de uma nota do XML não oferece corrigir, mas deixa cancelar", async () => {
    serve([invoice({})]);
    mocks.POST.mockReturnValue(ok(invoice({ status: "CANCELADA" })));
    open();

    await userEvent.click(await screen.findByRole("button", { name: /Nº 42/ }));
    const sheet = screen.getByRole("dialog", { name: "Nota nº 42" });
    expect(within(sheet).getByText("Lida do XML")).toBeInTheDocument();
    expect(within(sheet).getByText("INSS retido")).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: "Corrigir os campos" })).not.toBeInTheDocument();

    await userEvent.click(within(sheet).getByRole("button", { name: "Marcar como cancelada" }));
    expect(mocks.POST).toHaveBeenCalledWith("/companies/{companyId}/invoices/{invoiceId}/cancel", {
      params: { path: { companyId: 7, invoiceId: 1 } },
    });
  });

  it("excluir pede confirmação", async () => {
    serve([invoice({ source: "MANUAL" })]);
    mocks.DELETE.mockResolvedValue({ response: new Response(null, { status: 204 }) });
    open();

    await userEvent.click(await screen.findByRole("button", { name: /Nº 42/ }));
    const sheet = screen.getByRole("dialog", { name: "Nota nº 42" });
    expect(within(sheet).getByRole("button", { name: "Corrigir os campos" })).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: "Excluir a nota" }));
    expect(mocks.DELETE).not.toHaveBeenCalled();

    await userEvent.click(within(sheet).getByRole("button", { name: "Excluir" }));
    expect(mocks.DELETE).toHaveBeenCalledWith("/companies/{companyId}/invoices/{invoiceId}", {
      params: { path: { companyId: 7, invoiceId: 1 } },
    });
  });
});
