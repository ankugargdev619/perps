export class ApiError<TCode extends string = string> extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: TCode,
    message: string
  ) {
    super(message)
  }
}
