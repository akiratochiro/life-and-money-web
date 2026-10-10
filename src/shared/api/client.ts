import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";
import { tokenStorage } from "../auth/tokenStorage";

export const api = createClient<paths>({
    baseUrl: import.meta.env.VITE_API_URL,
});

const authMiddleware: Middleware = {
    onRequest({ request }) {
        const token = tokenStorage.get();
        if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
        }
        return request;
    },
};

const unauthorizedMiddleware: Middleware = {
  onResponse({ request, response }) {
    const isAuthRoute = new URL(request.url).pathname.startsWith("/auth/");
    if (response.status === 401 && !isAuthRoute) {
      tokenStorage.clear();
      window.location.assign("/login?expired=1");
    }
    return response;
  },
};

api.use(authMiddleware, unauthorizedMiddleware);