import { createBrowserRouter } from "react-router";
import { AppShell } from "./AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { RequireAuth } from "../features/auth/RequireAuth";
import { HomePage } from "../features/home/HomePage";
import { NewTransactionPage } from "../features/transactions/NewTransactionPage";
import { TransactionsPage } from "../features/transactions/TransactionsPage";
import { CategoriesPage } from "../features/categories/CategoriesPage";
import { BudgetPage } from "../features/budget/BudgetPage";
import { GoalsPage } from "../features/goals/GoalsPage";
import { AnalyticsPage } from "../features/analytics/AnalyticsPage";

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
          { path: "/categories", element: <CategoriesPage /> },
          { path: "/transactions", element: <TransactionsPage /> },
          { path: "/transactions/new", element: <NewTransactionPage /> },
          { path: "/budget", element: <BudgetPage /> },
          { path: "/goals", element: <GoalsPage /> },
          { path: "/analytics", element: <AnalyticsPage /> },
        ],
      },
    ],
  },
]);