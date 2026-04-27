import { parseArgs, ParseError, defineSchema } from "../src";

describe("parseArgs error surface", () => {
  test("missing_value_for_scalar_option_throws", () => {
    const schema = defineSchema({ options: { host: { type: "string" } } });
    expect(() => parseArgs(["--host"], schema)).toThrow(ParseError);
    try {
      parseArgs(["--host"], schema);
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).code).toBe("MISSING_VALUE");
    }
  });

  test("unknown_long_option_throws_by_default", () => {
    const schema = defineSchema({ options: {} });
    expect(() => parseArgs(["--unknown"], schema)).toThrow(ParseError);
    try {
      parseArgs(["--unknown"], schema);
    } catch (e) {
      expect((e as ParseError).code).toBe("UNKNOWN_OPTION");
      expect((e as ParseError).token).toBe("--unknown");
    }
  });

  test("unknown_short_option_throws_by_default", () => {
    const schema = defineSchema({ options: {} });
    expect(() => parseArgs(["-x"], schema)).toThrow(/unknown option: -x/);
  });

  test("invalid_number_value_throws", () => {
    const schema = defineSchema({ options: { port: { type: "number" } } });
    expect(() => parseArgs(["--port", "abc"], schema)).toThrow(
      /expects a number/,
    );
  });

  test("invalid_boolean_value_throws", () => {
    const schema = defineSchema({ options: { verbose: { type: "boolean" } } });
    expect(() => parseArgs(["--verbose=maybe"], schema)).toThrow(
      /cannot accept value/,
    );
  });

  test("duplicate_scalar_value_throws", () => {
    const schema = defineSchema({ options: { host: { type: "string" } } });
    expect(() => parseArgs(["--host=a", "--host=b"], schema)).toThrow(
      /multiple times/,
    );
  });

  test("required_option_missing_throws", () => {
    const schema = defineSchema({
      options: { host: { type: "string", required: true } },
    });
    expect(() => parseArgs([], schema)).toThrow(/required/i);
    try {
      parseArgs([], schema);
    } catch (e) {
      expect((e as ParseError).code).toBe("REQUIRED_MISSING");
    }
  });

  test("choice_violation_throws_with_list", () => {
    const schema = defineSchema({
      options: {
        level: { type: "string", choices: ["low", "mid", "high"] },
      },
    });
    expect(() => parseArgs(["--level", "insane"], schema)).toThrow(
      /not in choices/,
    );
  });

  test("number_choice_accepts_matching_value", () => {
    const schema = defineSchema({
      options: { port: { type: "number", choices: [80, 443, 8080] } },
    });
    const out = parseArgs(["--port", "443"], schema);
    expect(out.values.port).toBe(443);
  });

  test("negation_on_non_negatable_is_unknown", () => {
    const schema = defineSchema({ options: { verbose: { type: "boolean" } } });
    expect(() => parseArgs(["--no-verbose"], schema)).toThrow(/unknown/);
  });

  test("ParseError_carries_name_and_instance_check", () => {
    const schema = defineSchema({ options: {} });
    try {
      parseArgs(["--x"], schema);
    } catch (e) {
      expect(e instanceof ParseError).toBe(true);
      expect(e instanceof Error).toBe(true);
      expect((e as ParseError).name).toBe("ParseError");
    }
  });

  test("argv_not_array_throws", () => {
    const schema = defineSchema({ options: {} });
    expect(() => parseArgs("--foo" as unknown as string[], schema)).toThrow(
      /argv must be an array/,
    );
  });
});
