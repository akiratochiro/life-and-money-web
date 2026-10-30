type Problem = {
  title?: string;
  detail?: string;
  errors?: Record<string, string>;
  /** Só nas respostas 429: quanto falta para a próxima tentativa ser aceita. */
  retryAfterSeconds?: number;
};

export class ApiError extends Error {
  readonly status: number;
  readonly problem: unknown;

  constructor(status: number, problem: unknown) {
    super(messageOf(problem));
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }

  get fieldErrors(): Record<string, string> {
    return (this.problem as Problem | undefined)?.errors ?? {};
  }

  /** Segundos de espera de um 429; nos outros erros, undefined. */
  get retryAfterSeconds(): number | undefined {
    if (this.status !== 429) return undefined;
    const seconds = (this.problem as Problem | undefined)?.retryAfterSeconds;
    return typeof seconds === "number" && seconds > 0 ? seconds : undefined;
  }
}

function messageOf(problem: unknown): string {
  const p = problem as Problem | undefined;
  return p?.detail ?? "Algo deu errado. Tente de novo.";
}

export async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await request;
  if (error !== undefined || data === undefined) {
    throw new ApiError(response.status, error);
  }
  return data;
}

export async function expectNoContent(
  request: Promise<{ error?: unknown; response: Response }>,
): Promise<void> {
  const { error, response } = await request;
  if (error !== undefined || !response.ok) {
    throw new ApiError(response.status, error);
  }
}