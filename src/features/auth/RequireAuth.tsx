import { Navigate, Outlet, useLocation } from "react-router";
import { sessionExpired } from "../../shared/auth/session";
import { useSessionStatus } from "./sessionContext";

export function RequireAuth() {
  const status = useSessionStatus();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-ink-900"
        aria-busy="true"
        aria-label="Carregando"
      >
        <div className="h-10 w-10 animate-pulse rounded-full bg-surface" />
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <Navigate
        to={sessionExpired() ? "/login?expired=1" : "/login"}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
