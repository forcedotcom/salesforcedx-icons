const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parseArgs } = require("node:util");
const { DOMParser, XMLSerializer, onWarningStopParsing } = require("@xmldom/xmldom");

const COMPATIBILITY_ALIASES = Object.freeze({
  "seti-icons": Object.freeze({
    vite: Object.freeze({ codepoint: 0xf101, canonical: "vite" }),
  }),
  "sfdx-icons": Object.freeze({
    accept: Object.freeze({ codepoint: 0xf101, canonical: "action-accept" }),
    explain: Object.freeze({ codepoint: 0xf102, canonical: "action-explain" }),
    reject: Object.freeze({ codepoint: 0xf103, canonical: "action-reject" }),
  }),
});

function aliasesFor(iconSet) {
  const definitions = COMPATIBILITY_ALIASES[iconSet];
  if (!definitions) throw new Error(`unsupported --iconSet "${iconSet}"`);
  return Object.fromEntries(
    Object.entries(definitions).map(([name, { codepoint }]) => [name, codepoint])
  );
}

function readIconSet(args) {
  const { values } = parseArgs({
    args,
    options: { iconSet: { type: "string" } },
    strict: true,
  });
  if (!values.iconSet) throw new Error("--iconSet is required");
  aliasesFor(values.iconSet);
  return values.iconSet;
}

function normalizeLegacyViewBox(source) {
  const document = new DOMParser({
    onError: onWarningStopParsing,
  }).parseFromString(source, "application/xml");
  const root = document.documentElement;
  const values = (root.getAttribute("viewBox") || "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);

  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return source;
  }

  const [x, y, width, height] = values;
  if (width <= height) return source;

  root.setAttribute("viewBox", [x, y - (width - height), width, width].join(" "));
  return new XMLSerializer().serializeToString(document);
}

function prepareInputDirectory(sourceDirectory, iconSet) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${iconSet}-fonts-`));
  const inputDirectory = path.join(temporaryRoot, "icons");

  try {
    fs.cpSync(sourceDirectory, inputDirectory, { recursive: true });

    for (const entry of fs.readdirSync(inputDirectory, { withFileTypes: true })) {
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".svg") {
        continue;
      }
      const file = path.join(inputDirectory, entry.name);
      const source = fs.readFileSync(file, "utf8");
      const normalized = normalizeLegacyViewBox(source);
      if (normalized !== source) fs.writeFileSync(file, normalized);
    }

    if (iconSet === "sfdx-icons") {
      for (const name of ["accept", "explain", "reject"]) {
        const canonical = path.join(inputDirectory, `action-${name}.svg`);
        if (!fs.existsSync(canonical)) {
          fs.copyFileSync(path.join(inputDirectory, `${name}.svg`), canonical);
        }
      }
    }

    return { inputDirectory, temporaryRoot };
  } catch (error) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

async function main(args = process.argv.slice(2)) {
  const iconSet = readIconSet(args);
  const configFile = path.join(__dirname, "..", "src", iconSet, "fantasticon.js");
  const config = require(configFile);
  const { generateFonts } = require("fantasticon");
  const { inputDirectory, temporaryRoot } = prepareInputDirectory(
    path.resolve(config.inputDir),
    iconSet
  );

  try {
    await generateFonts({
      ...config,
      inputDir: inputDirectory,
      codepoints: { ...config.codepoints, ...aliasesFor(iconSet) },
    });
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Failed to generate fonts: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  COMPATIBILITY_ALIASES,
  aliasesFor,
  main,
  normalizeLegacyViewBox,
  prepareInputDirectory,
  readIconSet,
};
