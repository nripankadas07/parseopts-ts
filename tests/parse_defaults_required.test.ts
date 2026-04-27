import { parseArgs, defineSchema } from "../src";

describe("parseArgs defaults and required", () => {
  test("default_string_applied_when_absent", () => {
    const schema = defineSchema({
      options: { host: { type: "string", default: "localhost" } },
    });
    const out = parseArgs([], schema);
    expect(out.values.host).toBe("localhost");
  });

  test("default_number_applied_when_absent", () => {
    const schema = defineSchema({
      options: { port: { type: "number", default: 80 } },
    });
    const out = parseArgs([], schema);
    expect(out.values.port).toBe(80);
  });

  test("default_boolean_false_applied_when_absent", () => {
    const schema = defineSchema({
      options: { verbose: { type: "boolean", default: false } },
    });
    const out = parseArgs([], schema);
    expect(out.values.verbose).toBe(false);
  });

  test("provided_value_overrides_default", () => {
    const schema = defineSchema({
      options: { host: { type: "string", default: "localhost" } },
    });
    const out = parseArgs(["--host", "example.com"], schema);
    expect(out.values.host).toBe("example.com");
  });

  test("required_with_value_succeeds", () => {
    const schema = defineSchema({
      options: { host: { type: "string", required: true } },
    });
    const out = parseArgs(["--host=example.com"], schema);
    expect(out.values.host).toBe("example.com");
  });

  test("required_honored_with_default_present", () => {
    const schema = defineSchema({
      options: {
        host: { type: "string", required: true, default: "default.example" },
      },
    });
    const out = parseArgs([], schema);
    expect(out.values.host).toBe("default.example");
  });

  test("all_types_coexist_in_single_parse", () => {
    const schema = defineSchema({
      options: {
        name: { type: "string", default: "forge" },
        port: { type: "number", default: 80 },
        debug: { type: "boolean", default: false },
        tag: { type: "string[]" },
        weight: { type: "number[]" },
      },
    });
    const out = parseArgs(
      [
        "--name",
        "svc",
        "--port",
        "8443",
        "--debug",
        "--tag",
        "a",
        "--tag",
        "b",
        "-w=1",
      ],
      {
        ...schema,
        options: {
          ...schema.options,
          weight: { type: "number[]", alias: "w" },
        },
      },
    );
    expect(out.values.name).toBe("svc");
    expect(out.values.port).toBe(8443);
    expect(out.values.debug).toBe(true);
    expect(out.values.tag).toEqual(["a", "b"]);
    expect(out.values.weight).toEqual([1]);
  });
});
