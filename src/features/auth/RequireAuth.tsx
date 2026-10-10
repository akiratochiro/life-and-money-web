import { Navigate, Outlet, useLocation } from "react-router";
import { tokenStorage } from "../../shared/auth/tokenStorage";

export function RequireAuth() {
  const location = useLocation();

  if (!tokenStorage.get()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}