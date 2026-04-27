import { parseArgs, defineSchema } from "../src";

describe("parseArgs basic long options", () => {
  const schema = defineSchema({
    options: {
      host: { type: "string" },
      port: { type: "number" },
      verbose: { type: "boolean" },
    },
  });

  test("parses_long_space_value_to_string", () => {
    const out = parseArgs(["--host", "localhost"], schema);
    expect(out.values.host).toBe("localhost");
    expect(out.positional).toEqual([]);
  });

  test("parses_long_equals_value_to_string", () => {
    const out = parseArgs(["--host=localhost"], schema);
    expect(out.values.host).toBe("localhost");
  });

  test("parses_long_equals_empty_string", () => {
    const out = parseArgs(["--host="], schema);
    expect(out.values.host).toBe("");
  });

  test("parses_number_option_via_space", () => {
    const out = parseArgs(["--port", "8080"], schema);
    expect(out.values.port).toBe(8080);
  });

  test("parses_boolean_without_value_sets_true", () => {
    const out = parseArgs(["--verbose"], schema);
    expect(out.values.verbose).toBe(true);
  });

  test("parses_boolean_inline_true_value", () => {
    const out = parseArgs(["--verbose=true"], schema);
    expect(out.values.verbose).toBe(true);
  });

  test("parses_boolean_inline_false_value", () => {
    const out = parseArgs(["--verbose=false"], schema);
    expect(out.values.verbose).toBe(false);
  });

  test("empty_argv_yields_empty_result", () => {
    const out = parseArgs([], schema);
    expect(out.values).toEqual({});
    expect(out.positional).toEqual([]);
    expect(out.unknown).toEqual([]);
  });
});

describe("parseArgs short options", () => {
  const schema = defineSchema({
    options: {
      host: { type: "string", alias: "H" },
      port: { type: "number", alias: "p" },
      verbose: { type: "boolean", alias: "v" },
      quiet: { type: "boolean", alias: "q" },
      extra: { type: "boolean", alias: "x" },
    },
  });

  test("short_with_space_value", () => {
    const out = parseArgs(["-H", "example.com"], schema);
    expect(out.values.host).toBe("example.com");
  });

  test("short_with_inline_value", () => {
    const out = parseArgs(["-Hexample.com"], schema);
    expect(out.values.host).toBe("example.com");
  });

  test("short_with_equals_value", () => {
    const out = parseArgs(["-H=example.com"], schema);
    expect(out.values.host).toBe("example.com");
  });

  test("short_boolean_flag_sets_true", () => {
    const out = parseArgs(["-v"], schema);
    expect(out.values.verbose).toBe(true);
  });

  test("short_cluster_of_booleans_expands", () => {
    const out = parseArgs(["-vqx"], schema);
    expect(out.values.verbose).toBe(true);
    expect(out.values.quiet).toBe(true);
    expect(out.values.extra).toBe(true);
  });

  test("short_cluster_with_value_at_end", () => {
    const out = parseArgs(["-vqp", "443"], schema);
    expect(out.values.verbose).toBe(true);
    expect(out.values.quiet).toBe(true);
    expect(out.values.port).toBe(443);
  });

  test("short_cluster_with_inline_trailing_value", () => {
    const out = parseArgs(["-vqp443"], schema);
    expect(out.values.port).toBe(443);
  });
});
