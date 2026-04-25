/**
 * Public error class emitted by parseArgs.
 */
export class ParseError extends Error {
  public readonly code: ParseErrorCode;
  public readonly token: string;
  constructor(code: ParseErrorCode, token: string, message: string) {
    super(message);
    this.name = "ParseError";
    this.code = code;
    this.token = token;
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

export type ParseErrorCode =
  | "INVALID_SCHEMA"
  | "UNKNOWN_OPTION"
  | "MISSING_VALUE"
  | "INVALID_VALUE"
  | "INVALID_CHOICE"
  | "REQUIRED_MISSING"
  | "DUPLICATE_VALUE";
