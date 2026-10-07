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

api.use(authMiddleware);