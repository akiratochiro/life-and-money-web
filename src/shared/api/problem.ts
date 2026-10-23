type Problem = {
  title?: string;
  detail?: string;
  errors?: Record<string, string>;
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