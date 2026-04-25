import { ParseError } from "./errors";
import { OptionDef, OptionValue, Schema } from "./types";

/**
 * Compiled, validated view of a {@link Schema}. Every option name in
 * the original schema appears under `byName`; every alias — both long
 * and short — resolves to the same canonical long name via `aliasToName`.
 */
export interface CompiledSchema {
  byName: Map<string, OptionDef>;
  aliasToName: Map<string, string>;
  shortToName: Map<string, string>;
  stopAtPositional: boolean;
  allowUnknown: boolean;
}

const LONG_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;
const SHORT_NAME = /^[A-Za-z0-9?]$/;

/**
 * Compile a raw schema into an internal lookup structure and validate
 * its shape. Throws {@link ParseError} with code `INVALID_SCHEMA` on
 * every structural problem so callers see a single error surface.
 */
export function compileSchema(schema: Schema): CompiledSchema {
  assertSchemaShape(schema);
  const byName = new Map<string, OptionDef>();
  const aliasToName = new Map<string, string>();
  const shortToName = new Map<string, string>();

  for (const [name, def] of Object.entries(schema.options)) {
    validateOptionName(name);
    validateOptionDef(name, def);
    byName.set(name, def);
    aliasToName.set(name, name);
    registerAliases(name, def, aliasToName, shortToName);
  }

  return {
    byName,
    aliasToName,
    shortToName,
    stopAtPositional: Boolean(schema.stopAtPositional),
    allowUnknown: Boolean(schema.allowUnknown),
  };
}

function assertSchemaShape(schema: Schema): void {
  if (schema === null || typeof schema !== "object") {
    throw new ParseError("INVALID_SCHEMA", "", "schema must be an object");
  }
  if (schema.options === null || typeof schema.options !== "object") {
    throw new ParseError(
      "INVALID_SCHEMA",
      "",
      "schema.options must be an object",
    );
  }
}

function validateOptionName(name: string): void {
  if (!LONG_NAME.test(name)) {
    throw new ParseError(
      "INVALID_SCHEMA",
      name,
      `invalid option name: "${name}"`,
    );
  }
}

function validateOptionDef(name: string, def: OptionDef): void {
  if (!def || typeof def !== "object") {
    throw new ParseError(
      "INVALID_SCHEMA",
      name,
      `option "${name}" must be an object`,
    );
  }
  validateType(name, def);
  validateDefault(name, def);
  validateChoices(name, def);
  validateNegatable(name, def);
}

function validateType(name: string, def: OptionDef): void {
  const allowed = ["boolean", "string", "number", "string[]", "number[]"];
  if (!allowed.includes(def.type)) {
    throw new ParseError(
      "INVALID_SCHEMA",
      name,
      `option "${name}" has unknown type "${String(def.type)}"`,
    );
  }
}

function validateDefault(name: string, def: OptionDef): void {
  if (def.default === undefined) return;
  const d = def.default as OptionValue;
  const bad =
    (def.type === "boolean" && typeof d !== "boolean") ||
    (def.type === "string" && typeof d !== "string") ||
    (def.type === "number" && typeof d !== "number") ||
    (def.type === "string[]" && !isStringArray(d)) ||
    (def.type === "number[]" && !isNumberArray(d));
  if (bad) {
    throw new ParseError(
      "INVALID_SCHEMA",
      name,
      `option "${name}" default does not match type "${def.type}"`,
    );
  }
}

function validateChoices(name: string, def: OptionDef): void {
  if (!def.choices) return;
  if (def.type === "boolean") {
    throw new ParseError(
      "INVALID_SCHEMA",
      name,
      `option "${name}" cannot use choices with boolean`,
    );
  }
  if (!Array.isArray(def.choices) || def.choices.length === 0) {
    throw new ParseError(
      "INVALID_SCHEMA",
      name,
      `option "${name}" choices must be a non-empty array`,
    );
  }
}

function validateNegatable(name: string, def: OptionDef): void {
  if (def.negatable && def.type !== "boolean") {
    throw new ParseError(
      "INVALID_SCHEMA",
      name,
      `option "${name}" negatable requires boolean type`,
    );
  }
}

function registerAliases(
  name: string,
  def: OptionDef,
  aliasToName: Map<string, string>,
  shortToName: Map<string, string>,
): void {
  const aliases = normalizeAliases(def.alias);
  for (const alias of aliases) {
    registerAlias(name, alias, aliasToName, shortToName);
  }
}

function registerAlias(
  name: string,
  alias: string,
  aliasToName: Map<string, string>,
  shortToName: Map<string, string>,
): void {
  if (alias.length === 1) {
    if (!SHORT_NAME.test(alias)) {
      throw new ParseError(
        "INVALID_SCHEMA",
        alias,
        `invalid short alias "${alias}" for option "${name}"`,
      );
    }
    ensureUnique(shortToName, alias, name, "short alias");
    shortToName.set(alias, name);
  } else {
    if (!LONG_NAME.test(alias)) {
      throw new ParseError(
        "INVALID_SCHEMA",
        alias,
        `invalid long alias "${alias}" for option "${name}"`,
      );
    }
    ensureUnique(aliasToName, alias, name, "long alias");
    aliasToName.set(alias, name);
  }
}

function ensureUnique(
  map: Map<string, string>,
  key: string,
  owner: string,
  label: string,
): void {
  if (map.has(key) && map.get(key) !== owner) {
    throw new ParseError(
      "INVALID_SCHEMA",
      key,
      `duplicate ${label} "${key}" between "${map.get(key)!}" and "${owner}"`,
    );
  }
}

function normalizeAliases(alias?: string | string[]): string[] {
  if (alias === undefined) return [];
  return Array.isArray(alias) ? alias : [alias];
}

function isStringArray(value: OptionValue): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isNumberArray(value: OptionValue): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === "number");
}
