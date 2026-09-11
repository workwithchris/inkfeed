// Carries the raw HTTP response from a publisher (e.g. a webhook) so the
// publish use case can persist it even when the request is treated as failed.
export class PublishResponseError extends Error {
  constructor(
    message: string,
    readonly responseStatus: number | null,
    readonly responseBody: string | null,
  ) {
    super(message);
    this.name = "PublishResponseError";
  }
}
