import { readFileSync, readdirSync, rmSync } from "node:fs";
import { rolldown } from "rolldown";
import { rollup } from "rollup";

const check = (label, dir) => {
  const main = readFileSync(`${dir}/main.js`, "utf8");
  console.log(`\n== ${label}`);
  console.log("  entry exports:", main.match(/export \{[^}]*\}/g)?.at(-1));
  for (const f of readdirSync(dir)) {
    if (/["']\.\/main\.js["']/.test(readFileSync(`${dir}/${f}`, "utf8"))) console.log(`  ${f} imports ./main.js`);
  }
};

for (const pes of ["strict", "exports-only"]) {
  const dir = `dist/rolldown-${pes}`;
  rmSync(dir, { recursive: true, force: true });
  const b = await rolldown({ input: "src/main.js", preserveEntrySignatures: pes });
  await b.write({ dir, format: "esm" });
  await b.close();
  check(`rolldown ${(await import("rolldown/package.json", { with: { type: "json" } })).default.version}, preserveEntrySignatures: "${pes}"`, dir);
}

const dir = "dist/rollup-strict";
rmSync(dir, { recursive: true, force: true });
const r = await rollup({ input: "src/main.js", preserveEntrySignatures: "strict" });
await r.write({ dir, format: "esm" });
check(`rollup ${(await import("rollup/package.json", { with: { type: "json" } })).default.version}, preserveEntrySignatures: "strict"`, dir);
