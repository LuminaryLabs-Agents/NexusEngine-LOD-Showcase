import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";

const target = process.argv[2] ?? "index.html";
const loader = await readFile(target, "utf8");
const payloadMatch = loader.match(/const b='([^']+)'/);

if (!payloadMatch) {
  throw new Error(`Could not locate compressed showcase payload in ${target}.`);
}

let source = gunzipSync(Buffer.from(payloadMatch[1], "base64")).toString("utf8");

const oldUi = `const ui = {
    viewportWidth: document.querySelector("#viewportWidth"),
    aspect: document.querySelector("#aspect"),
    renderScale: document.querySelector("#renderScale"),
    treeCount: document.querySelector("#treeCount"),`;

const fixedUi = `const ui = {
    viewportWidth: document.querySelector("#viewportWidth"),
    aspect: document.querySelector("#aspect"),
    renderScale: document.querySelector("#renderScale"),
    worldMode: document.querySelector("#worldMode"),
    buildingCount: document.querySelector("#buildingCount"),
    cityRings: document.querySelector("#cityRings"),
    cityRingsValue: document.querySelector("#cityRingsValue"),
    treeCount: document.querySelector("#treeCount"),`;

if (source.includes(oldUi)) {
  source = source.replace(oldUi, fixedUi);
}

const validationMarker = `  function fail(message) {`;
const validationBlock = `  for (const [name, element] of Object.entries(ui)) {
    if (!element) {
      throw new Error(\`Missing required UI control: \${name}\`);
    }
  }

  ui.cityRingsValue.textContent = ui.cityRings.value;

`;

if (!source.includes("Missing required UI control:")) {
  if (!source.includes(validationMarker)) {
    throw new Error("Could not locate UI validation insertion point.");
  }
  source = source.replace(validationMarker, validationBlock + validationMarker);
}

for (const required of ["worldMode", "buildingCount", "cityRings", "cityRingsValue"]) {
  if (!source.includes(`${required}: document.querySelector`)) {
    throw new Error(`UI patch failed: ${required} is still missing.`);
  }
}

const patchedPayload = gzipSync(Buffer.from(source), { level: 9, mtime: 0 }).toString("base64");
const patchedLoader = loader.replace(payloadMatch[1], patchedPayload);
await writeFile(target, patchedLoader, "utf8");
console.log(`Patched city UI controls in ${target}.`);
