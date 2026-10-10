type Problem = {
  title?: string;
  detail?: string;
  errors?: Record<string, string>;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: unknown,
  ) {
    super(messageOf(problem));
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