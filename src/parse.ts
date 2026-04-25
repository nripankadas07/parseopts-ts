import { ParseError } from "./errors";
import { CompiledSchema, compileSchema } from "./schema";
import { OptionDef, OptionValue, ParseResult, Schema } from "./types";

/**
 * Parse a POSIX/GNU-style `argv` array against a schema.
 *
 * Supports `--long`, `--long=val`, `--long val`, `-s`, `-svalue`,
 * short-flag clustering (`-abc` → `-a -b -c` when all are boolean),
 * negatable booleans (`--no-foo`), repeatable array options,
 * choices, numeric coercion, and the `--` positional terminator.
 *
 * @throws {@link ParseError} on schema validation failures, unknown
 * options, missing required options, invalid values, or duplicate
 * scalar values.
 */
export function parseArgs(argv: string[], schema: Schema): ParseResult {
  if (!Array.isArray(argv)) {
    throw new ParseError("INVALID_SCHEMA", "", "argv must be an array");
  }
  const compiled = compileSchema(schema);
  const result: ParseResult = { values: {}, positional: [], unknown: [] };
  const walker = new ArgvWalker(argv);
  while (walker.hasNext()) {
    const token = walker.next();
    routeToken(token, walker, compiled, result);
  }
  applyDefaults(compiled, result);
  enforceRequired(compiled, result);
  return result;
}

class ArgvWalker {
  private readonly argv: string[];
  private index = 0;

  constructor(argv: string[]) {
    this.argv = argv;
  }

  hasNext(): boolean {
    return this.index < this.argv.length;
  }

  next(): string {
    return this.argv[this.index++];
  }

  consume(): string | undefined {
    if (!this.hasNext()) return undefined;
    return this.argv[this.index++];
  }

  drain(): string[] {
    const rest = this.argv.slice(this.index);
    this.index = this.argv.length;
    return rest;
  }
}

function routeToken(
  token: string,
  walker: ArgvWalker,
  compiled: CompiledSchema,
  result: ParseResult,
): void {
  if (token === "--") {
    for (const rest of walker.drain()) result.positional.push(rest);
    return;
  }
  if (isLongOption(token)) {
    handleLong(token.slice(2), walker, compiled, result);
    return;
  }
  if (isShortOption(token)) {
    handleShortCluster(token.slice(1), walker, compiled, result);
    return;
  }
  handlePositional(token, walker, compiled, result);
}

function isLongOption(token: string): boolean {
  return token.length > 2 && token.startsWith("--");
}

function isShortOption(token: string): boolean {
  return (
    token.length >= 2 &&
    token.startsWith("-") &&
    !token.startsWith("--") &&
    !/^-[0-9]/.test(token)
  );
}

function handleLong(
  body: string,
  walker: ArgvWalker,
  compiled: CompiledSchema,
  result: ParseResult,
): void {
  const eq = body.indexOf("=");
  const name = eq === -1 ? body : body.slice(0, eq);
  const inline = eq === -1 ? undefined : body.slice(eq + 1);
  const resolved = resolveLongName(name, compiled);
  if (!resolved) {
    recordUnknown(`--${body}`, compiled, result);
    return;
  }
  if (resolved.negated) {
    ensureBooleanNegation(resolved.canonical, compiled, inline);
    result.values[resolved.canonical] = false;
    return;
  }
  applyOption(resolved.canonical, inline, walker, compiled, result);
}

function resolveLongName(
  name: string,
  compiled: CompiledSchema,
): { canonical: string; negated: boolean } | undefined {
  const direct = compiled.aliasToName.get(name);
  if (direct) return { canonical: direct, negated: false };
  if (!name.startsWith("no-")) return undefined;
  const base = name.slice(3);
  const canonical = compiled.aliasToName.get(base);
  if (!canonical) return undefined;
  const def = compiled.byName.get(canonical);
  if (!def || !def.negatable) return undefined;
  return { canonical, negated: true };
}

function ensureBooleanNegation(
  canonical: string,
  _compiled: CompiledSchema,
  inline: string | undefined,
): void {
  // Schema validation guarantees negatable => boolean, and
  // resolveLongName only flags `negated: true` when negatable is set,
  // so we only need to reject an explicit value here.
  if (inline !== undefined) {
    throw new ParseError(
      "INVALID_VALUE",
      `--no-${canonical}`,
      `--no-${canonical} does not take a value`,
    );
  }
}

function handleShortCluster(
  body: string,
  walker: ArgvWalker,
  compiled: CompiledSchema,
  result: ParseResult,
): void {
  let cursor = 0;
  while (cursor < body.length) {
    const letter = body[cursor];
    const canonical = compiled.shortToName.get(letter);
    if (!canonical) {
      handleUnknownShort(body, cursor, compiled, result);
      return;
    }
    const def = compiled.byName.get(canonical)!;
    if (def.type === "boolean") {
      setBoolean(canonical, result);
      cursor += 1;
      continue;
    }
    const inline = cursor + 1 < body.length ? body.slice(cursor + 1) : undefined;
    const stripped = stripInlineEquals(inline);
    applyOption(canonical, stripped, walker, compiled, result);
    return;
  }
}

function stripInlineEquals(inline: string | undefined): string | undefined {
  if (inline === undefined) return undefined;
  return inline.startsWith("=") ? inline.slice(1) : inline;
}

function handleUnknownShort(
  body: string,
  cursor: number,
  compiled: CompiledSchema,
  result: ParseResult,
): void {
  const remainder = body.slice(cursor);
  recordUnknown(`-${remainder}`, compiled, result);
}

function handlePositional(
  token: string,
  walker: ArgvWalker,
  compiled: CompiledSchema,
  result: ParseResult,
): void {
  result.positional.push(token);
  if (!compiled.stopAtPositional) return;
  for (const rest of walker.drain()) result.positional.push(rest);
}

function recordUnknown(
  token: string,
  compiled: CompiledSchema,
  result: ParseResult,
): void {
  if (!compiled.allowUnknown) {
    throw new ParseError("UNKNOWN_OPTION", token, `unknown option: ${token}`);
  }
  result.unknown.push(token);
}

function applyOption(
  canonical: string,
  inline: string | undefined,
  walker: ArgvWalker,
  compiled: CompiledSchema,
  result: ParseResult,
): void {
  const def = compiled.byName.get(canonical)!;
  if (def.type === "boolean") {
    assignBoolean(canonical, inline, result);
    return;
  }
  const raw = inline !== undefined ? inline : takeValue(canonical, walker);
  const coerced = coerceValue(canonical, raw, def);
  assignScalarOrArray(canonical, coerced, def, result);
}

function takeValue(canonical: string, walker: ArgvWalker): string {
  const next = walker.consume();
  if (next === undefined) {
    throw new ParseError(
      "MISSING_VALUE",
      canonical,
      `option "--${canonical}" requires a value`,
    );
  }
  return next;
}

function assignBoolean(
  canonical: string,
  inline: string | undefined,
  result: ParseResult,
): void {
  if (inline === undefined) {
    setBoolean(canonical, result);
    return;
  }
  const truthy = ["true", "1", "yes", "on"];
  const falsy = ["false", "0", "no", "off"];
  if (truthy.includes(inline)) {
    result.values[canonical] = true;
    return;
  }
  if (falsy.includes(inline)) {
    result.values[canonical] = false;
    return;
  }
  throw new ParseError(
    "INVALID_VALUE",
    canonical,
    `boolean option "--${canonical}" cannot accept value "${inline}"`,
  );
}

function setBoolean(canonical: string, result: ParseResult): void {
  result.values[canonical] = true;
}

function coerceValue(
  canonical: string,
  raw: string,
  def: OptionDef,
): string | number {
  if (def.type === "string" || def.type === "string[]") return raw;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new ParseError(
      "INVALID_VALUE",
      canonical,
      `option "--${canonical}" expects a number, got "${raw}"`,
    );
  }
  return parsed;
}

function assignScalarOrArray(
  canonical: string,
  coerced: string | number,
  def: OptionDef,
  result: ParseResult,
): void {
  enforceChoice(canonical, coerced, def);
  if (def.type === "string[]" || def.type === "number[]") {
    appendArrayValue(canonical, coerced, result);
    return;
  }
  if (canonical in result.values) {
    throw new ParseError(
      "DUPLICATE_VALUE",
      canonical,
      `option "--${canonical}" was given multiple times`,
    );
  }
  result.values[canonical] = coerced;
}

function appendArrayValue(
  canonical: string,
  coerced: string | number,
  result: ParseResult,
): void {
  const current = result.values[canonical];
  if (current === undefined) {
    result.values[canonical] = [coerced] as OptionValue;
    return;
  }
  (current as Array<string | number>).push(coerced);
}

function enforceChoice(
  canonical: string,
  value: string | number,
  def: OptionDef,
): void {
  if (!def.choices) return;
  if (!def.choices.includes(value)) {
    const formatted = def.choices.map((c) => JSON.stringify(c)).join(", ");
    throw new ParseError(
      "INVALID_CHOICE",
      canonical,
      `option "--${canonical}" value "${value}" not in choices [${formatted}]`,
    );
  }
}

function applyDefaults(compiled: CompiledSchema, result: ParseResult): void {
  for (const [name, def] of compiled.byName) {
    if (name in result.values) continue;
    if (def.default !== undefined) {
      result.values[name] = cloneDefault(def.default);
    }
  }
}

function cloneDefault(value: OptionValue): OptionValue {
  return Array.isArray(value) ? ([...value] as OptionValue) : value;
}

function enforceRequired(compiled: CompiledSchema, result: ParseResult): void {
  for (const [name, def] of compiled.byName) {
    if (def.required && !(name in result.values)) {
      throw new ParseError(
        "REQUIRED_MISSING",
        name,
        `required option "--${name}" was not provided`,
      );
    }
  }
}
