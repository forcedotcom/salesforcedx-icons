const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const opentype = require("opentype.js");

const script = path.resolve(__dirname, "..", "scripts", "export-csv.js");

function createFont(file) {
  const glyphPath = new opentype.Path();
  glyphPath.moveTo(0, 0);
  glyphPath.lineTo(100, 0);
  glyphPath.lineTo(100, 100);
  glyphPath.close();

  const font = new opentype.Font({
    familyName: "CSV Test",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: [
      new opentype.Glyph({
        name: ".notdef",
        advanceWidth: 500,
        path: new opentype.Path(),
      }),
      new opentype.Glyph({
        name: "deduplicated-font-glyph",
        unicodes: [0xf123, 0xf124],
        advanceWidth: 500,
        path: glyphPath,
      }),
    ],
  });

  fs.writeFileSync(file, Buffer.from(font.toArrayBuffer()));
}

test("export-csv emits one authoritative row per mapping entry", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "icons-csv-"));
  const fontFile = path.join(directory, "sample.ttf");
  const mappingFile = path.join(directory, "mapping.json");
  createFont(fontFile);
  fs.writeFileSync(
    mappingFile,
    JSON.stringify({
      "authoritative-name": 0xf123,
      "same-codepoint-alias": 0xf123,
      "second-authoritative-name": 0xf124,
    })
  );

  const result = spawnSync(
    process.execPath,
    [script, "-f", fontFile, "--mapping", mappingFile],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trimEnd().split("\n"), [
    "short_name,character,unicode",
    "authoritative-name,,F123",
    "same-codepoint-alias,,F123",
    "second-authoritative-name,,F124",
  ]);
});

test("export-csv rejects a mapping codepoint that resolves to .notdef", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "icons-csv-"));
  const fontFile = path.join(directory, "sample.ttf");
  const mappingFile = path.join(directory, "mapping.json");
  createFont(fontFile);
  fs.writeFileSync(mappingFile, JSON.stringify({ missing: 0xf999 }));

  const result = spawnSync(
    process.execPath,
    [script, "-f", fontFile, "--mapping", mappingFile],
    { encoding: "utf8" }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /resolves to \.notdef/);
});

test("export-csv exits nonzero when the font cannot be parsed", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "icons-csv-"));
  const invalidFont = path.join(directory, "invalid.ttf");
  fs.writeFileSync(invalidFont, "not a font");

  const mappingFile = path.join(directory, "mapping.json");
  fs.writeFileSync(mappingFile, "{}");
  const result = spawnSync(
    process.execPath,
    [script, "-f", invalidFont, "--mapping", mappingFile],
    { encoding: "utf8" }
  );

  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /failed to export CSV/i);
});
