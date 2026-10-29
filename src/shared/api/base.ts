/**
 * A API é servida na mesma origem do front: em produção o Worker repassa /api/* para o Render, e
 * no desenvolvimento o proxy do Vite repassa para o localhost:8080. Por isso o caminho é relativo,
 * e não existe uma URL da API para configurar no build.
 */
export const API_BASE = "/api";
