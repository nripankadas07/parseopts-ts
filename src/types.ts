/**
 * Typed value the parser can produce for a single option.
 */
export type OptionValue = boolean | string | number | string[] | number[];

export type OptionType = "boolean" | "string" | "number" | "string[]" | "number[]";

export interface OptionDef {
  type: OptionType;
  alias?: string | string[];
  default?: OptionValue;
  required?: boolean;
  choices?: ReadonlyArray<string | number>;
  negatable?: boolean;
  description?: string;
}

export interface Schema {
  options: Record<string, OptionDef>;
  stopAtPositional?: boolean;
  allowUnknown?: boolean;
}

export interface ParseResult {
  values: Record<string, OptionValue>;
  positional: string[];
  unknown: string[];
}

export function defineSchema(schema: Schema): Schema {
  return schema;
}
