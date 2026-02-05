export type AppError = {
  message: string;
  code?: string;
  details?: unknown;
};

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError };
