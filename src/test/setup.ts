import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sem `globals: true`, a Testing Library não encontra um `afterEach` global para se registrar,
// então a limpeza do DOM entre um teste e outro precisa ser declarada aqui.
afterEach(cleanup);
