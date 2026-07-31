const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const opentype = require("opentype.js");
const { COMPATIBILITY_ALIASES } = require("./generate-fonts");
const { validateSpriteIntegrity } = require("./svg-sprite");

const root = path.resolve(__dirname, "..");
const iconSets = ["seti-icons", "sfdx-icons"];
const metricFixture = require("../test/fixtures/font-metrics-fantasticon-1.json");

function readNonempty(file) {
  const contents = fs.readFileSync(file);
  assert(contents.length > 0, `${path.relative(root, file)} is empty`);
  return contents;
}

function formatUnicode(codepoint) {
  return codepoint.toString(16).toUpperCase().padStart(codepoint > 0xffff ? 6 : 4, "0");
}

function parseFont(file) {
  const contents = readNonempty(file);
  return opentype.parse(
    contents.buffer.slice(
      contents.byteOffset,
      contents.byteOffset + contents.byteLength
    )
  );
}

function selectNpmCommand({
  execPath = process.execPath,
  npmExecPath = process.env.npm_execpath,
  platform = process.platform,
} = {}) {
  if (npmExecPath) {
    return { command: execPath, args: [npmExecPath] };
  }
  return { command: platform === "win32" ? "npm.cmd" : "npm", args: [] };
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

function assertGlyphMetrics(actual, expected, message) {
  assert.strictEqual(actual.length, expected.length, message);
  for (let index = 0; index < expected.length; index += 1) {
    assert(
      Math.abs(actual[index] - expected[index]) <= 1e-9,
      `${message}: metric ${index} expected ${expected[index]}, received ${actual[index]}`
    );
  }
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

function validateFontMetrics(iconSet, font) {
  const expected = metricFixture.iconSets[iconSet];
  assert.deepStrictEqual(
    globalMetrics(font),
    expected.global,
    `${iconSet} global font metrics changed from the Fantasticon 1 baseline`
  );

  for (const [unicode, metrics] of Object.entries(expected.glyphs)) {
    const glyph = font.charToGlyph(String.fromCodePoint(Number.parseInt(unicode, 16)));
    assert(
      glyph && glyph.index !== 0 && glyph.name !== ".notdef",
      `${iconSet} metric fixture glyph ${unicode} resolves to .notdef`
    );
    assertGlyphMetrics(
      glyphMetrics(glyph),
      metrics,
      `${iconSet} glyph ${unicode} metrics changed from the Fantasticon 1 baseline`
    );
  }
}

function validateAliases(iconSet, mapping, font) {
  for (const [name, { codepoint, canonical }] of Object.entries(
    COMPATIBILITY_ALIASES[iconSet]
  )) {
    const aliasGlyph = font.charToGlyph(String.fromCodePoint(codepoint));
    assert(
      aliasGlyph && aliasGlyph.index !== 0 && aliasGlyph.name !== ".notdef",
      `${iconSet} compatibility alias ${name} (${formatUnicode(codepoint)}) resolves to .notdef`
    );

    if (iconSet === "sfdx-icons") {
      const canonicalCodepoint = mapping[canonical];
      const canonicalGlyph = font.charToGlyph(
        String.fromCodePoint(canonicalCodepoint)
      );
      assert(
        canonicalGlyph &&
          canonicalGlyph.index !== 0 &&
          canonicalGlyph.name !== ".notdef",
        `${iconSet} canonical ${canonical} (${formatUnicode(canonicalCodepoint)}) resolves to .notdef`
      );
      assert.strictEqual(
        canonicalGlyph.index,
        aliasGlyph.index,
        `${iconSet} ${canonical} and compatibility alias ${name} do not resolve to the same glyph`
      );
      assertGlyphMetrics(
        glyphMetrics(canonicalGlyph),
        glyphMetrics(aliasGlyph),
        `${iconSet} ${canonical} and compatibility alias ${name} have different geometry`
      );
    }
  }
}

function validatePackage(iconSet) {
  const sourceDirectory = path.join(root, "src", iconSet);
  const outputDirectory = path.join(root, "dist", iconSet);
  const sourceManifestFile = path.join(sourceDirectory, "package.json");
  const outputManifestFile = path.join(outputDirectory, "package.json");
  const manifest = JSON.parse(readNonempty(sourceManifestFile).toString("utf8"));
  const mapping = JSON.parse(
    readNonempty(path.join(sourceDirectory, "template", "mapping.json")).toString(
      "utf8"
    )
  );

  for (const file of [...manifest.files, `${iconSet}.csv`, `${iconSet}.html`]) {
    readNonempty(path.join(outputDirectory, file));
  }

  assert(
    readNonempty(outputManifestFile).equals(readNonempty(sourceManifestFile)),
    `${iconSet} copied package.json differs from its source manifest`
  );

  const css = readNonempty(path.join(outputDirectory, `${iconSet}.css`)).toString(
    "utf8"
  );
  const library = readNonempty(
    path.join(outputDirectory, `${iconSet}Library.ts`)
  ).toString("utf8");
  for (const [name, codepoint] of Object.entries(mapping)) {
    const cssRule = `.${manifest.name.split("/").at(-1).replace("-icons", "-icon")}-${name}:before { content: "\\${codepoint.toString(16)}" }`;
    assert(css.includes(cssRule), `${iconSet} CSS mapping missing for ${name}`);
    assert(
      library.includes(`register('${name}', 0x${codepoint.toString(16)})`),
      `${iconSet} TypeScript mapping missing for ${name}`
    );
  }

  const font = parseFont(path.join(outputDirectory, `${iconSet}.ttf`));
  for (const [name, codepoint] of Object.entries(mapping)) {
    const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
    assert(
      glyph && glyph.index !== 0 && glyph.name !== ".notdef",
      `${iconSet} TTF mapping for ${name} (${formatUnicode(codepoint)}) resolves to .notdef`
    );
  }
  validateAliases(iconSet, mapping, font);
  validateFontMetrics(iconSet, font);

  const woff2 = readNonempty(path.join(outputDirectory, `${iconSet}.woff2`));
  assert.strictEqual(
    woff2.subarray(0, 4).toString("ascii"),
    "wOF2",
    `${iconSet} WOFF2 has an invalid signature`
  );

  const csvLines = readNonempty(path.join(outputDirectory, `${iconSet}.csv`))
    .toString("utf8")
    .trimEnd()
    .split("\n");
  const expectedCsvLines = [
    "short_name,character,unicode",
    ...Object.entries(mapping).map(
      ([name, codepoint]) =>
        `${name},${String.fromCodePoint(codepoint)},${formatUnicode(codepoint)}`
    ),
  ];
  assert.deepStrictEqual(
    csvLines,
    expectedCsvLines,
    `${iconSet} CSV names/codepoints differ from the authoritative mapping`
  );

  const sprite = readNonempty(path.join(outputDirectory, `${iconSet}.svg`)).toString(
    "utf8"
  );
  const symbolIds = [...sprite.matchAll(/<symbol\b[^>]*\bid="([^"]+)"/g)].map(
    (match) => match[1]
  );
  const mappedIds = Object.keys(mapping);
  assert.strictEqual(symbolIds.length, mappedIds.length, `${iconSet} symbol count`);
  assert.deepStrictEqual(
    new Set(symbolIds),
    new Set(mappedIds),
    `${iconSet} sprite IDs differ from mapping IDs`
  );
  const spriteIntegrity = validateSpriteIntegrity(sprite, `${iconSet} combined sprite`);
  assert(
    spriteIntegrity.idCount >= symbolIds.length,
    `${iconSet} combined sprite is missing symbol IDs`
  );

  const npm = selectNpmCommand();
  const pack = spawnSync(
    npm.command,
    [...npm.args, "pack", "--dry-run", "--json"],
    { cwd: outputDirectory, encoding: "utf8" }
  );
  assert.strictEqual(pack.status, 0, pack.stderr || pack.stdout);
  const packResult = JSON.parse(pack.stdout);
  assert(Array.isArray(packResult) && packResult.length === 1, "invalid npm pack result");
  const packedFiles = packResult[0].files.map(({ path: file }) => file).sort();
  const expectedFiles = ["package.json", ...manifest.files].sort();
  assert.deepStrictEqual(
    packedFiles,
    expectedFiles,
    `${iconSet} npm package files differ from the manifest allowlist`
  );

  console.log(
    `validated ${iconSet}: ${csvLines.length - 1} CSV rows, ${symbolIds.length} symbols, ${spriteIntegrity.idCount} unique sprite IDs, ${spriteIntegrity.referenceCount} local fragment references, ${packedFiles.length} packed files`
  );
}

function main() {
  for (const iconSet of iconSets) {
    validatePackage(iconSet);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Build validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  assertGlyphMetrics,
  globalMetrics,
  glyphMetrics,
  main,
  selectNpmCommand,
  validateAliases,
  validateFontMetrics,
  validatePackage,
};
