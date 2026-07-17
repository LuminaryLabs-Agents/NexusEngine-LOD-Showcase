import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

const target = process.argv[2] ?? "index.html";
const loader = await readFile(target, "utf8");
const targetDir = dirname(target);

async function readPayload() {
  const inline = loader.match(/const b='([^']+)'/);
  if (inline) {
    return { mode: "inline", base64: inline[1], count: 1 };
  }

  const list = loader.match(/Promise\.all\(\[([^\]]+)\]\.map\(i=>fetch\(`\.\/payload\/p\$\{i\}\.txt`\)/);
  if (!list) {
    throw new Error(`Could not locate inline or chunked showcase payload in ${target}.`);
  }

  const indexes = list[1]
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Number.isInteger);

  if (!indexes.length) {
    throw new Error("Chunked payload list is empty.");
  }

  const parts = [];
  for (const index of indexes) {
    parts.push((await readFile(join(targetDir, "payload", `p${index}.txt`), "utf8")).trim());
  }
  return { mode: "chunks", base64: parts.join(""), count: indexes.length };
}

const payload = await readPayload();
let source = gunzipSync(Buffer.from(payload.base64, "base64")).toString("utf8");

const uiStart = source.indexOf("const ui = {");
if (uiStart < 0) throw new Error("Could not locate the UI lookup object.");
const uiEnd = source.indexOf("\n  };", uiStart);
if (uiEnd < 0) throw new Error("Could not locate the end of the UI lookup object.");

let uiBlock = source.slice(uiStart, uiEnd + 5);
const missingEntries = [
  ["worldMode", "#worldMode"],
  ["buildingCount", "#buildingCount"],
  ["cityRings", "#cityRings"],
  ["cityRingsValue", "#cityRingsValue"]
];

for (const [name, selector] of missingEntries) {
  if (!uiBlock.includes(`${name}:`)) {
    const anchor = '    renderScale: document.querySelector("#renderScale"),';
    if (!uiBlock.includes(anchor)) throw new Error("Could not locate UI insertion anchor.");
    uiBlock = uiBlock.replace(anchor, `${anchor}\n    ${name}: document.querySelector("${selector}"),`);
  }
}
source = source.slice(0, uiStart) + uiBlock + source.slice(uiEnd + 5);

const validationText = "Missing required UI control:";
if (!source.includes(validationText)) {
  const marker = "  function fail(message) {";
  const validation = `  for (const [name, element] of Object.entries(ui)) {\n    if (!element) {\n      throw new Error(\`Missing required UI control: \${name}\`);\n    }\n  }\n\n  ui.cityRingsValue.textContent = ui.cityRings.value;\n\n`;
  if (!source.includes(marker)) throw new Error("Could not locate UI validation insertion point.");
  source = source.replace(marker, validation + marker);
}

for (const [name] of missingEntries) {
  if (!source.includes(`${name}: document.querySelector`)) {
    throw new Error(`UI patch failed: ${name} is still missing.`);
  }
}

if (!source.includes("ui.worldMode.addEventListener") || !source.includes("ui.cityRings.addEventListener")) {
  throw new Error("Expected city listeners are missing from the showcase source.");
}

const patchedBase64 = gzipSync(Buffer.from(source), { level: 9, mtime: 0 }).toString("base64");

if (payload.mode === "inline") {
  const inline = loader.match(/const b='([^']+)'/);
  await writeFile(target, loader.replace(inline[1], patchedBase64), "utf8");
} else {
  const chunkSize = Math.ceil(patchedBase64.length / payload.count);
  for (let index = 0; index < payload.count; index += 1) {
    const chunk = patchedBase64.slice(index * chunkSize, (index + 1) * chunkSize);
    await writeFile(join(targetDir, "payload", `p${index}.txt`), chunk, "utf8");
  }
}

console.log(`Patched and verified city UI controls in ${target} (${payload.mode}).`);
