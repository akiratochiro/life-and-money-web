import { createBrowserRouter } from "react-router";
import { AppShell } from "./AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { RequireAuth } from "../features/auth/RequireAuth";
import { HomePage } from "../features/home/HomePage";

function ComingSoon({ title }: { title: string }) {
  return <h1 className="font-display text-2xl font-semibold">{title} (em breve)</h1>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/transactions", element: <ComingSoon title="Extrato" /> },
          { path: "/transactions/new", element: <ComingSoon title="Nova transação" /> },
          { path: "/budget", element: <ComingSoon title="Orçamento" /> },
          { path: "/goals", element: <ComingSoon title="Metas" /> },
        ],
      },
    ],
  },
]);