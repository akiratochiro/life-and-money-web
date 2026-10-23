import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";
import { currentAccessToken, endSession } from "../auth/session";

export const api = createClient<paths>({
    baseUrl: import.meta.env.VITE_API_URL,
    // Necessário para o cookie do refresh token viajar. Como o cookie tem Path=/auth, ele só
    // é enviado nas chamadas de autenticação, e não em toda requisição da API.
    credentials: "include",
});

/** As rotas de /auth se autenticam pelo cookie ou pelo corpo, nunca pelo Bearer. */
function isAuthRoute(url: string): boolean {
    return new URL(url).pathname.startsWith("/auth/");
}

const authMiddleware: Middleware = {
    async onRequest({ request }) {
        if (isAuthRoute(request.url)) {
            return request;
        }

        const token = await currentAccessToken();
        if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
        }
        return request;
    },
};

const unauthorizedMiddleware: Middleware = {
    onResponse({ request, response }) {
        // Chegar aqui significa que o token foi recusado mesmo depois da renovação automática:
        // a sessão acabou de verdade. Quem decide para onde ir é o SessionProvider, que escuta
        // essa mudança — assim não há recarregamento de página no meio do uso.
        if (response.status === 401 && !isAuthRoute(request.url)) {
            endSession();
        }
        return response;
    },
};

api.use(authMiddleware, unauthorizedMiddleware);
