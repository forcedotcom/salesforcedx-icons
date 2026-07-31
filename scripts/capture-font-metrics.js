const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parseArgs } = require("node:util");
const opentype = require("opentype.js");

const ICON_SETS = ["seti-icons", "sfdx-icons"];
const LEGACY_ALIASES = Object.freeze({
  "seti-icons": [0xf101],
  "sfdx-icons": [0xf101, 0xf102, 0xf103],
});
const LEGACY_FALLBACKS = Object.freeze({
  "seti-icons": Object.freeze({}),
  "sfdx-icons": Object.freeze({
    0xe900: 0xf101,
    0xe901: 0xf102,
    0xe902: 0xf103,
  }),
});

function formatUnicode(codepoint) {
  return codepoint.toString(16).toUpperCase().padStart(4, "0");
}

function isDefinedGlyph(glyph) {
  return Boolean(glyph && glyph.index !== 0 && glyph.name !== ".notdef");
}

function glyphForCodepoint(font, codepoint, fallbackCodepoint) {
  const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
  if (isDefinedGlyph(glyph)) return glyph;
  if (fallbackCodepoint !== undefined) {
    const fallback = font.charToGlyph(String.fromCodePoint(fallbackCodepoint));
    if (isDefinedGlyph(fallback)) return fallback;
  }
  throw new Error(
    `legacy font glyph ${formatUnicode(codepoint)} resolves to .notdef` +
      (fallbackCodepoint === undefined
        ? ""
        : ` and fallback ${formatUnicode(fallbackCodepoint)} is unavailable`)
  );
}

function glyphMetrics(glyph) {
  const bounds = glyph.getBoundingBox();
  return [
    glyph.advanceWidth,
    bounds.x1,
    bounds.y1,
    bounds.x2,
    bounds.y2,
  ];
}

function globalMetrics(font) {
  return {
    unitsPerEm: font.unitsPerEm,
    ascender: font.ascender,
    descender: font.descender,
    hheaLineGap: font.tables.hhea.lineGap,
    typoLineGap: font.tables.os2.sTypoLineGap,
    winAscent: font.tables.os2.usWinAscent,
    winDescent: font.tables.os2.usWinDescent,
  };
}

function parseFont(file) {
  const contents = fs.readFileSync(file);
  return opentype.parse(
    contents.buffer.slice(
      contents.byteOffset,
      contents.byteOffset + contents.byteLength
    )
  );
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function commandOutput(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", ...options }).trim();
}

function captureIconSet(worktree, iconSet) {
  const mapping = JSON.parse(
    fs.readFileSync(
      path.join(worktree, "src", iconSet, "template", "mapping.json"),
      "utf8"
    )
  );
  const font = parseFont(path.join(worktree, "dist", iconSet, `${iconSet}.ttf`));
  const fallbacks = LEGACY_FALLBACKS[iconSet];
  const glyphs = {};

  for (const codepoint of Object.values(mapping)) {
    glyphs[formatUnicode(codepoint)] = glyphMetrics(
      glyphForCodepoint(font, codepoint, fallbacks[codepoint])
    );
  }
  for (const codepoint of LEGACY_ALIASES[iconSet]) {
    glyphs[formatUnicode(codepoint)] = glyphMetrics(
      glyphForCodepoint(font, codepoint)
    );
  }

  const captured = { global: globalMetrics(font), glyphs };
  if (Object.keys(fallbacks).length > 0) {
    captured.baselineFallbacks = Object.fromEntries(
      Object.entries(fallbacks).map(([codepoint, fallback]) => [
        formatUnicode(Number(codepoint)),
        formatUnicode(fallback),
      ])
    );
  }
  return captured;
}

function captureFixture(worktree) {
  const lockFile = path.join(worktree, "package-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
  const packages = lock.packages || {};
  const metadata = {
    repositoryCommit: commandOutput("git", ["rev-parse", "HEAD"], {
      cwd: worktree,
    }),
    fantasticonVersion: packages["node_modules/fantasticon"]?.version,
    opentypeVersion: packages["node_modules/opentype.js"]?.version,
    nodeVersion: process.version.replace(/^v/, ""),
    npmVersion: commandOutput(process.platform === "win32" ? "npm.cmd" : "npm", [
      "--version",
    ]),
    platform: `${process.platform}-${process.arch}`,
    packageLockSha256: sha256(lockFile),
  };

  for (const [name, value] of Object.entries(metadata)) {
    if (!value) throw new Error(`could not determine fixture metadata ${name}`);
  }

  return {
    version: 1,
    metadata,
    iconSets: Object.fromEntries(
      ICON_SETS.map((iconSet) => [iconSet, captureIconSet(worktree, iconSet)])
    ),
  };
}

function readOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      worktree: { type: "string" },
      output: { type: "string" },
    },
    strict: true,
  });
  if (!values.worktree) throw new Error("--worktree is required");
  if (!values.output) throw new Error("--output is required");
  return values;
}

function main(args = process.argv.slice(2)) {
  const options = readOptions(args);
  const fixture = captureFixture(path.resolve(options.worktree));
  fs.writeFileSync(path.resolve(options.output), `${JSON.stringify(fixture)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Failed to capture font metrics: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  captureFixture,
  captureIconSet,
  formatUnicode,
  glyphForCodepoint,
  glyphMetrics,
  globalMetrics,
  main,
  readOptions,
};
