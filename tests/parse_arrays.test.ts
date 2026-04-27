import { parseArgs, defineSchema } from "../src";

describe("parseArgs array options", () => {
  const schema = defineSchema({
    options: {
      tag: { type: "string[]", alias: "t" },
      weight: { type: "number[]", alias: "w" },
    },
  });

  test("string_array_repeat_long_form", () => {
    const out = parseArgs(["--tag", "a", "--tag", "b"], schema);
    expect(out.values.tag).toEqual(["a", "b"]);
  });

  test("string_array_equals_form", () => {
    const out = parseArgs(["--tag=a", "--tag=b"], schema);
    expect(out.values.tag).toEqual(["a", "b"]);
  });

  test("string_array_short_form_repeat", () => {
    const out = parseArgs(["-t", "red", "-t", "blue"], schema);
    expect(out.values.tag).toEqual(["red", "blue"]);
  });

  test("number_array_coerces_each_element", () => {
    const out = parseArgs(["-w", "1", "-w", "2.5"], schema);
    expect(out.values.weight).toEqual([1, 2.5]);
  });

  test("array_single_value_becomes_single_item_array", () => {
    const out = parseArgs(["--tag", "only"], schema);
    expect(out.values.tag).toEqual(["only"]);
  });

  test("array_empty_when_flag_absent", () => {
    const out = parseArgs([], schema);
    expect(out.values.tag).toBeUndefined();
  });
});

describe("parseArgs array defaults are cloned", () => {
  test("default_array_is_not_shared_between_calls", () => {
    const schema = defineSchema({
      options: { tag: { type: "string[]", default: ["seed"] } },
    });
    const firstRun = parseArgs([], schema);
    const secondRun = parseArgs([], schema);
    (firstRun.values.tag as string[]).push("mutated");
    expect(secondRun.values.tag).toEqual(["seed"]);
  });
});
