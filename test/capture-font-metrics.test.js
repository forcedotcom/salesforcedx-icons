const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  formatUnicode,
  glyphForCodepoint,
  readOptions,
} = require(path.join(__dirname, "..", "scripts", "capture-font-metrics.js"));
const fixture = require("./fixtures/font-metrics-fantasticon-1.json");

test("capture-font-metrics falls back from a legacy .notdef canonical glyph", () => {
  const fallbackGlyph = { index: 7, name: "accept" };
  const font = {
    charToGlyph(character) {
      return character.codePointAt(0) === 0xf101
        ? fallbackGlyph
        : { index: 0, name: ".notdef" };
    },
  };

  assert.strictEqual(glyphForCodepoint(font, 0xe900, 0xf101), fallbackGlyph);
  assert.throws(
    () => glyphForCodepoint(font, 0xe901),
    /glyph E901 resolves to \.notdef/
  );
});

test("capture-font-metrics fixture records its exact legacy provenance", () => {
  assert.deepEqual(fixture.metadata, {
    repositoryCommit: "9d828ce6b69f770f005d25b339fd1d1044872508",
    fantasticonVersion: "1.2.3",
    opentypeVersion: "1.3.4",
    nodeVersion: "25.8.1",
    npmVersion: "11.11.0",
    platform: "darwin-arm64",
    packageLockSha256:
      "912d0bf2a41cb9845b770bbd399514785fffb732b4a1abd3327984631e0bb7a9",
  });
  assert.deepEqual(fixture.iconSets["sfdx-icons"].baselineFallbacks, {
    E900: "F101",
    E901: "F102",
    E902: "F103",
  });
  assert.equal(formatUnicode(0xf101), "F101");
});

test("capture-font-metrics requires explicit input and output paths", () => {
  assert.throws(() => readOptions([]), /--worktree is required/);
  assert.throws(
    () => readOptions(["--worktree", "/tmp/baseline"]),
    /--output is required/
  );
});
