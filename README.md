# parseopts-ts

A tiny zero-dependency TypeScript argv parser with typed options, short and long aliases, negatable booleans, repeatable arrays, `choices`, `stopAtPositional`, and the POSIX `--` terminator.

Designed to fit in a single file you can read end-to-end in five minutes. The whole parser is under 350 lines, fully strict-mode TypeScript, and has 100% line, branch, statement, and function coverage from 72 tests.

## Install

```bash
npm install parseopts-ts
```

Runtime target is Node.js 18+ (ES2020). No runtime dependencies.

## Quick example

```ts
import { parseArgs, defineSchema, ParseError } from "parseopts-ts";

const schema = defineSchema({
  options: {
    host:    { type: "string",   alias: "H", default: "localhost" },
    port:    { type: "number",   alias: "p", default: 8080 },
    verbose: { type: "boolean",  alias: "v" },
    color:   { type: "boolean",  negatable: true, default: true },
    tag:     { type: "string[]", alias: "t" },
    level:   { type: "string",   choices: ["debug", "info", "warn"] },
  },
  stopAtPositional: true,
});

try {
  const { values, positional } = parseArgs(process.argv.slice(2), schema);
  console.log(values, positional);
} catch (err) {
  if (err instanceof ParseError) {
    console.error(`error (${err.code}): ${err.message}`);
    process.exit(2);
  }
  throw err;
}
```

## Supported syntax

| Form | Example |
|------|---------|
| Long flag | `--verbose` |
| Long with value | `--host example.com`, `--host=example.com` |
| Short flag | `-v` |
| Short cluster | `-vqx` (all booleans) |
| Negatable boolean | `--no-color` |
| Repeatable array | `--tag a --tag b` |
| Terminator | `--` |

## Quality

- **72 tests**, 100% line/branch/statement/function coverage
- Zero runtime dependencies
- Strict-mode TypeScript with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
- Functions ≤30 lines, nesting ≤3 levels

## API

### `parseArgs(argv, schema)`
Parses `argv` according to `schema` and returns a `ParseResult`. Throws `ParseError` on validation failures.

### `defineSchema(schema)`
Identity helper for IDE type inference.

### `ParseError`
Machine-readable `code`: `INVALID_SCHEMA`, `UNKNOWN_OPTION`, `MISSING_VALUE`, `INVALID_VALUE`, `INVALID_CHOICE`, `REQUIRED_MISSING`, `DUPLICATE_VALUE`.

## Running tests

```bash
npm install
npm test               # 72 tests
npm run test:coverage  # 100% lines, branches, statements, functions
```

## License

MIT
