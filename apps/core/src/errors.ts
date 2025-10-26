export class KintoneRequestError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "KintoneRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
