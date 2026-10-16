// Runs every *.test.mjs file. Works the same on Windows, macOS and Linux:  npm test
import { readdirSync } from "node:fs";

const files = readdirSync(new URL("./", import.meta.url)).filter((f) => f.endsWith(".test.mjs")).sort();
let failed = 0;
for (const f of files) {
  try {
    await import("./" + f);
    console.log(`PASS ${f}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${f}`);
    console.error(e);
  }
}
console.log(failed ? `\n${failed} test file(s) FAILED` : `\nAll ${files.length} test files passed`);
process.exit(failed ? 1 : 0);
