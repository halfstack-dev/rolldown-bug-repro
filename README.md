# rolldown: `preserveEntrySignatures: "strict"` adds exports to an entry chunk

```sh
npm install
npm start
```

## Reproduction

Three ESM files, no CommonJS, no plugins:

```js
// src/main.js
import { lib } from "./lib.js";

export default async function main() {
  const { load } = await import("./adapter.js");
  return lib() + (await load());
}

// src/adapter.js
export async function load() {
  const { lib } = await import("./lib.js");
  return lib();
}

// src/lib.js
export function lib() {
  return "lib";
}
```

`src/main.js` statically imports `lib.js`. It also dynamically imports `adapter.js`, which dynamically imports `lib.js` again.

`build.mjs` builds with `preserveEntrySignatures: "strict"` and `"exports-only"`. It also builds once with Rollup for comparison. `run.mjs` imports each built entry and prints its export names.

## What is expected?

`src/main.js` exports only `default`, so the built `main.js` should export only `default`. Rollup does this:

```
rollup-strict          Object.keys(entry) = ["default"]  default() = "liblib"
```

## What is actually happening?

Rolldown adds `t`, the namespace of `src/lib.js`, as an export of the entry chunk. The `adapter` chunk imports it from the entry:

```
rolldown-strict        Object.keys(entry) = ["default","t"]  default() = "liblib"
rolldown-exports-only  Object.keys(entry) = ["default","t"]  default() = "liblib"
```

```js
// dist/rolldown-strict/main.js
var lib_exports = /* @__PURE__ */ __exportAll({ lib: () => lib });
// ...
export { main as default, lib_exports as t };

// dist/rolldown-strict/adapter-*.js
const { lib } = await import("./main.js").then((n) => n.t);
```

Rolldown changes the entry's export signature with `"strict"`. It doesn't emit an error or warning, and it doesn't create a facade chunk the way Rollup does.

Variations I tested:

- If `main.js` does `import("./lib.js")` directly, without the intermediate `adapter.js` chunk, the entry keeps only `default`.
- A re-exporting barrel or a CommonJS module isn't needed. This is different from #10015, which needs CJS `require`.

## Real-world impact

This breaks Cloudflare Workers built with `@cloudflare/vite-plugin` with Vite 8 and React Router. workerd treats every named export of the main module as an entrypoint, so the Worker fails to start:

```
service core:user:<worker>: Uncaught TypeError: Incorrect type for map entry 'at':
the provided value is not of type 'function or ExportedHandler'.
```

In our app the dynamic chain is `hono-openapi` → `@standard-community/standard-json` (lazy `zod.js` adapter) → `await import("zod/v4/core")`. The worker also imports `zod` statically. About 180 zod internals were added as exports of the worker entry, including `INVALID` (a `Symbol`) exported as `at`.

`@cloudflare/vite-plugin` sets `preserveEntrySignatures: "strict"` for the worker entry. That doesn't help, because Rolldown ignores it in this case.

Workaround: put the shared module in its own chunk so the entry doesn't need to re-export it:

```js
output: { codeSplitting: { groups: [{ name: "zod", test: /[\\/]node_modules[\\/](\.pnpm[\\/])?zod@?/ }] } }
```

## System info

- rolldown 1.2.13. Also seen with 1.2.12 via Vite 8.3.2.
- rollup 4.64.2, for comparison.
- Node 24, macOS.
