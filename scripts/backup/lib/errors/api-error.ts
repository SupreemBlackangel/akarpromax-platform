export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly fieldErrors?: FieldErrors;

  constructor(public status: number, message: string, public code?: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}
