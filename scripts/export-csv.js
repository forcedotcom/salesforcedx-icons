// https://github.com/bitinn/character-map

const fs = require("node:fs");
const { parseArgs } = require("node:util");
const opentype = require("opentype.js");

function formatUnicode(unicode) {
  const width = unicode > 0xffff ? 6 : 4;
  return unicode.toString(16).toUpperCase().padStart(width, "0");
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

function glyphForCodepoint(font, codepoint) {
  const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
  if (!glyph || glyph.index === 0 || glyph.name === ".notdef") {
    throw new Error(`mapping codepoint ${formatUnicode(codepoint)} resolves to .notdef`);
  }
  return glyph;
}

function readOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      font: { type: "string", short: "f" },
      mapping: { type: "string" },
    },
    strict: true,
  });
  if (!values.font) throw new Error("use -f to specify your font path");
  if (!values.mapping) throw new Error("use --mapping to specify mapping.json");
  return values;
}

function csvFor(font, mapping) {
  const rows = ["short_name,character,unicode"];
  for (const [name, codepoint] of Object.entries(mapping)) {
    if (!Number.isInteger(codepoint) || codepoint < 0 || codepoint > 0x10ffff) {
      throw new Error(`mapping contains an invalid codepoint for "${name}"`);
    }
    glyphForCodepoint(font, codepoint);
    rows.push(
      `${name},${String.fromCodePoint(codepoint)},${formatUnicode(codepoint)}`
    );
  }
  return `${rows.join("\n")}\n`;
}

function main(args = process.argv.slice(2)) {
  const options = readOptions(args);
  const font = parseFont(options.font);
  const mapping = JSON.parse(fs.readFileSync(options.mapping, "utf8"));
  process.stdout.write(csvFor(font, mapping));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Failed to export CSV: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { csvFor, formatUnicode, glyphForCodepoint, main, readOptions };
