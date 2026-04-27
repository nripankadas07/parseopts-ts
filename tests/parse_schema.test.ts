import { parseArgs, ParseError, defineSchema } from "../src";

describe("schema validation errors", () => {
  test("non_object_schema_throws", () => {
    expect(() => parseArgs([], null as unknown as never)).toThrow(ParseError);
  });

  test("schema_without_options_object_throws", () => {
    expect(() =>
      parseArgs([], { options: null as unknown as never } as never),
    ).toThrow(/schema.options/);
  });

  test("invalid_option_name_throws", () => {
    const schema = {
      options: { "1-bad": { type: "string" as const } },
    };
    expect(() => parseArgs([], schema)).toThrow(/invalid option name/);
  });

  test("unknown_type_throws", () => {
    const schema = {
      options: { foo: { type: "bogus" as unknown as "string" } },
    };
    expect(() => parseArgs([], schema)).toThrow(/unknown type/);
  });

  test("default_type_mismatch_throws", () => {
    const schema = {
      options: { age: { type: "number" as const, default: "old" as never } },
    };
    expect(() => parseArgs([], schema)).toThrow(/default does not match type/);
  });

  test("choices_on_boolean_throws", () => {
    const schema = {
      options: {
        flag: {
          type: "boolean" as const,
          choices: [true, false] as unknown as string[],
        },
      },
    };
    expect(() => parseArgs([], schema)).toThrow(
      /cannot use choices with boolean/,
    );
  });

  test("empty_choices_throws", () => {
    const schema = {
      options: { level: { type: "string" as const, choices: [] } },
    };
    expect(() => parseArgs([], schema)).toThrow(/non-empty array/);
  });

  test("negatable_on_non_boolean_throws", () => {
    const schema = {
      options: { host: { type: "string" as const, negatable: true } },
    };
    expect(() => parseArgs([], schema)).toThrow(/negatable requires boolean/);
  });

  test("bad_short_alias_throws", () => {
    const schema = defineSchema({
      options: { host: { type: "string", alias: "!" } },
    });
    expect(() => parseArgs([], schema)).toThrow(/invalid short alias/);
  });

  test("bad_long_alias_throws", () => {
    const schema = defineSchema({
      options: { host: { type: "string", alias: "1bad" } },
    });
    expect(() => parseArgs([], schema)).toThrow(/invalid long alias/);
  });

  test("duplicate_short_alias_throws", () => {
    const schema = defineSchema({
      options: {
        foo: { type: "boolean", alias: "x" },
        bar: { type: "boolean", alias: "x" },
      },
    });
    expect(() => parseArgs([], schema)).toThrow(/duplicate short alias/);
  });

  test("duplicate_long_alias_throws", () => {
    const schema = defineSchema({
      options: {
        foo: { type: "string", alias: "shared" },
        bar: { type: "string", alias: "shared" },
      },
    });
    expect(() => parseArgs([], schema)).toThrow(/duplicate long alias/);
  });

  test("resolves_long_alias_correctly", () => {
    const schema = defineSchema({
      options: { host: { type: "string", alias: ["server", "H"] } },
    });
    const out = parseArgs(["--server=localhost"], schema);
    expect(out.values.host).toBe("localhost");
  });

  test("array_default_applies_when_absent", () => {
    const schema = defineSchema({
      options: { tag: { type: "string[]", default: ["seed"] } },
    });
    const out = parseArgs([], schema);
    expect(out.values.tag).toEqual(["seed"]);
  });

  test("number_array_default_validated", () => {
    const good = defineSchema({
      options: { weight: { type: "number[]", default: [1, 2] } },
    });
    const out = parseArgs([], good);
    expect(out.values.weight).toEqual([1, 2]);
  });

  test("number_array_default_type_mismatch_throws", () => {
    const bad = {
      options: {
        weight: {
          type: "number[]" as const,
          default: ["nope"] as unknown as number[],
        },
      },
    };
    expect(() => parseArgs([], bad)).toThrow(/default does not match type/);
  });

  test("option_def_not_object_throws", () => {
    const schema = {
      options: { foo: null as unknown as never },
    };
    expect(() => parseArgs([], schema)).toThrow(/must be an object/);
  });
});
