// Runs each built entry and prints its actual export names at runtime.
const dirs = ["rolldown-strict", "rolldown-exports-only", "rollup-strict"];
for (const d of dirs) {
  const mod = await import(`./dist/${d}/main.js`);
  console.log(`${d.padEnd(22)} Object.keys(entry) = ${JSON.stringify(Object.keys(mod))}  default() = ${JSON.stringify(await mod.default())}`);
}
