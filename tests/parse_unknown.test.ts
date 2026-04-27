import { parseArgs, defineSchema } from "../src";

describe("parseArgs allowUnknown", () => {
  const schema = defineSchema({
    options: { verbose: { type: "boolean", alias: "v" } },
    allowUnknown: true,
  });

  test("unknown_long_option_captured_in_unknown_list", () => {
    const out = parseArgs(["--foo", "--bar=baz"], schema);
    expect(out.unknown).toEqual(["--foo", "--bar=baz"]);
  });

  test("unknown_short_option_captured", () => {
    const out = parseArgs(["-xyz"], schema);
    expect(out.unknown).toEqual(["-xyz"]);
  });

  test("known_options_parsed_even_with_unknowns", () => {
    const out = parseArgs(["--foo", "-v"], schema);
    expect(out.values.verbose).toBe(true);
    expect(out.unknown).toEqual(["--foo"]);
  });

  test("unknown_does_not_pollute_positionals", () => {
    const out = parseArgs(["value", "--flag"], schema);
    expect(out.positional).toEqual(["value"]);
    expect(out.unknown).toEqual(["--flag"]);
  });
});
