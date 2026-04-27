import { parseArgs, defineSchema } from "../src";

describe("parseArgs negation and terminator", () => {
  const schema = defineSchema({
    options: {
      color: { type: "boolean", negatable: true, default: true },
      verbose: { type: "boolean", alias: "v" },
      output: { type: "string", alias: "o" },
    },
  });

  test("negated_boolean_sets_false", () => {
    const out = parseArgs(["--no-color"], schema);
    expect(out.values.color).toBe(false);
  });

  test("negated_boolean_rejects_inline_value", () => {
    expect(() => parseArgs(["--no-color=x"], schema)).toThrow(
      /does not take a value/,
    );
  });

  test("double_dash_terminator_sends_rest_to_positional", () => {
    const out = parseArgs(["-v", "--", "--not-a-flag", "-x"], schema);
    expect(out.values.verbose).toBe(true);
    expect(out.positional).toEqual(["--not-a-flag", "-x"]);
  });

  test("double_dash_with_value_token", () => {
    const out = parseArgs(["--", "a", "b", "c"], schema);
    expect(out.positional).toEqual(["a", "b", "c"]);
  });

  test("negative_number_positional_is_preserved", () => {
    const out = parseArgs(["--", "-3.14"], schema);
    expect(out.positional).toEqual(["-3.14"]);
  });

  test("negative_number_token_without_declared_short_is_positional", () => {
    const out = parseArgs(["-3"], schema);
    expect(out.positional).toEqual(["-3"]);
  });

  test("negation_applies_default_fallback_is_overridden", () => {
    const applied = parseArgs([], schema);
    expect(applied.values.color).toBe(true);
    const turnedOff = parseArgs(["--no-color"], schema);
    expect(turnedOff.values.color).toBe(false);
  });

  test("negation_prefix_on_unknown_base_is_unknown", () => {
    expect(() => parseArgs(["--no-ghost"], schema)).toThrow(/unknown/);
  });
});

describe("parseArgs stopAtPositional", () => {
  const schema = defineSchema({
    options: {
      verbose: { type: "boolean", alias: "v" },
      tag: { type: "string", alias: "t" },
    },
    stopAtPositional: true,
  });

  test("first_positional_terminates_option_parsing", () => {
    const out = parseArgs(["-v", "build", "--tag", "frontend"], schema);
    expect(out.values.verbose).toBe(true);
    expect(out.values.tag).toBeUndefined();
    expect(out.positional).toEqual(["build", "--tag", "frontend"]);
  });

  test("without_stop_flag_options_continue_after_positional", () => {
    const relaxed = parseArgs(
      ["-v", "build", "--tag", "frontend"],
      defineSchema({
        options: {
          verbose: { type: "boolean", alias: "v" },
          tag: { type: "string" },
        },
      }),
    );
    expect(relaxed.values.tag).toBe("frontend");
    expect(relaxed.positional).toEqual(["build"]);
  });
});
