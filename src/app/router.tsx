import { createBrowserRouter } from "react-router";
import { AppShell } from "./AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { RequireAuth } from "../features/auth/RequireAuth";
import { HomePage } from "../features/home/HomePage";
import { NewTransactionPage } from "../features/transactions/NewTransactionPage";
import { ComingSoon } from "./ComingSoon";

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
          { path: "/transactions/new", element: <NewTransactionPage /> },
          { path: "/budget", element: <ComingSoon title="Orçamento" /> },
          { path: "/goals", element: <ComingSoon title="Metas" /> },
        ],
      },
    ],
  },
]);