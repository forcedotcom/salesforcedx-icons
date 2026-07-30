const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const script = path.join(root, "scripts", "svg-sprite.js");

test("svg-sprite rejects malformed, declared-entity, and non-SVG input", () => {
  const { parseSvg } = require(script);

  assert.throws(() => parseSvg('<svg viewBox="0 0 16 16"><path></svg>'));
  assert.throws(() => parseSvg("<!DOCTYPE svg><svg/>"), /DOCTYPE/);
  assert.throws(
    () => parseSvg('<!DOCTYPE svg [<!ENTITY x "unsafe">]><svg/>'),
    /DOCTYPE/
  );
  assert.throws(() => parseSvg("<not-svg/>"), /root element must be <svg>/);
  assert.throws(
    () => parseSvg('<svg xmlns="https://example.com/not-svg"/>'),
    /root element must be <svg>/
  );
});

test("svg-sprite preserves nested content and safely serializes attributes", () => {
  const { parseSvg, symbolFor } = require(script);
  const parsed = parseSvg(
    '<svg id="source-id" viewBox="0 0 16 16"><g data-name="A &amp; &quot;B&quot;"><path class="x &amp; y"/></g></svg>'
  );

  assert.equal(
    symbolFor('mapped-"&-name', parsed),
    '<symbol id="mapped-&quot;&amp;-name" viewBox="0 0 16 16"><g data-name="A &amp; &quot;B&quot;"><path class="x &amp; y"/></g></symbol>'
  );
});

test("svg-sprite rejects all elements outside the repository allowlist", () => {
  const { parseSvg, symbolFor } = require(script);
  for (const element of [
    "script",
    "foreignObject",
    "iframe",
    "object",
    "embed",
    "animate",
    "set",
    "a",
  ]) {
    assert.throws(
      () => symbolFor("unsafe", parseSvg(`<svg><${element}/></svg>`)),
      /not allowed/
    );
  }
});

test("svg-sprite rejects attributes outside the repository allowlist", () => {
  const { parseSvg, symbolFor } = require(script);
  for (const attribute of ['onload="alert(1)"', 'aria-label="icon"', 'filter="none"']) {
    assert.throws(
      () => symbolFor("unsafe", parseSvg(`<svg><path ${attribute}/></svg>`)),
      /attribute .* not allowed/
    );
  }
});

test("svg-sprite rejects external and non-fragment links", () => {
  const { parseSvg, symbolFor } = require(script);
  for (const href of ["https://example.com/icon.svg#x", "icon.svg#x", "/icon.svg#x"]) {
    assert.throws(
      () => symbolFor("unsafe", parseSvg(`<svg><use href="${href}"/></svg>`)),
      /non-fragment/
    );
  }
});

test("svg-sprite rejects unsafe URLs and non-static CSS", () => {
  const { parseSvg, symbolFor } = require(script);
  for (const source of [
    '<svg><path fill="url(https://example.com/x)"/></svg>',
    '<svg><path fill="url(data:image/svg+xml,x)"/></svg>',
    '<svg><path fill="u\\72l(data:image/svg+xml,x)"/></svg>',
    '<svg><style>.icon { fill: u\\72l(https://example.com/x) }</style></svg>',
    '<svg><style>@import "https://example.com/x";</style></svg>',
    '<svg><style>.icon { stroke: red }</style></svg>',
    '<svg><style>.icon { width: expression(alert(1)) }</style></svg>',
    '<svg><path style="fill: red"/></svg>',
  ]) {
    assert.throws(() => symbolFor("unsafe", parseSvg(source)), /not allowed|style content/);
  }
});

test("svg-sprite namespaces one symbol's IDs and every kind of fragment reference", () => {
  const { parseSvg, symbolFor } = require(script);
  const source =
    '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><style>.icon { fill: url(\'#paint\') }</style><defs><linearGradient id="paint"/></defs><path id="shape" fill="url(#paint)"/><use href="#shape"/><use class="icon" xlink:href="#shape"/></svg>';

  assert.equal(
    symbolFor("safe", parseSvg(source)),
    '<symbol id="safe" xmlns:xlink="http://www.w3.org/1999/xlink"><style>.icon { fill: url(\'#safe--paint\') }</style><defs><linearGradient id="safe--paint"/></defs><path id="safe--shape" fill="url(#safe--paint)"/><use href="#safe--shape"/><use class="icon" xlink:href="#safe--shape"/></symbol>'
  );
});

test("svg-sprite rejects duplicate IDs and references outside the source symbol", () => {
  const { parseSvg, symbolFor } = require(script);
  assert.throws(
    () => symbolFor("duplicate", parseSvg('<svg><path id="same"/><path id="same"/></svg>')),
    /duplicate source ID "same"/
  );
  assert.throws(
    () => symbolFor("dangling", parseSvg('<svg><path fill="url(#other)"/></svg>')),
    /does not resolve inside its symbol/
  );
  assert.throws(
    () => symbolFor("dangling", parseSvg('<svg><use href="#other"/></svg>')),
    /does not resolve inside its symbol/
  );
});

test("svg-sprite integrity validation rejects duplicate, dangling, and cross-symbol references", () => {
  const { validateSpriteIntegrity } = require(script);
  assert.throws(
    () => validateSpriteIntegrity('<svg><symbol id="one"><path id="same"/></symbol><symbol id="two"><path id="same"/></symbol></svg>'),
    /duplicate ID "same"/
  );
  assert.throws(
    () => validateSpriteIntegrity('<svg><symbol id="one"><use href="#missing"/></symbol></svg>'),
    /does not resolve/
  );
  assert.throws(
    () => validateSpriteIntegrity('<svg><symbol id="one"><path id="target"/></symbol><symbol id="two"><use href="#target"/></symbol></svg>'),
    /outside its symbol/
  );
});

test("svg-sprite accepts every current source SVG", () => {
  const { parseSvg, symbolFor } = require(script);
  const sourceFiles = ["seti-icons", "sfdx-icons"].flatMap((iconSet) =>
    fs
      .readdirSync(path.join(root, "src", iconSet, "icons"))
      .filter((file) => file.endsWith(".svg"))
      .map((file) => path.join(root, "src", iconSet, "icons", file))
  );

  assert.equal(sourceFiles.length, 188);
  for (const sourceFile of sourceFiles) {
    assert.doesNotThrow(() =>
      symbolFor(path.basename(sourceFile, ".svg"), parseSvg(fs.readFileSync(sourceFile, "utf8")))
    );
  }
});

test("svg-sprite rejects missing arguments", () => {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--outDir is required/);
});

test("svg-sprite rejects an unwritable output path", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "icons-sprite-"));
  fs.mkdirSync(path.join(directory, "blocked.svg"));
  const result = spawnSync(
    process.execPath,
    [
      script,
      "--outDir",
      directory,
      "--iconSet",
      "sfdx-icons",
      "--outFile",
      "blocked.svg",
    ],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Failed to generate SVG sprite/);
});

test("svg-sprite rejects an unreadable icon set", () => {
  const result = spawnSync(
    process.execPath,
    [
      script,
      "--outDir",
      os.tmpdir(),
      "--iconSet",
      "missing-icons",
      "--outFile",
      "missing.svg",
    ],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Failed to generate SVG sprite/);
});

for (const iconSet of ["seti-icons", "sfdx-icons"]) {
  test(`svg-sprite generates every mapped ${iconSet} symbol`, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "icons-sprite-"));
    const output = path.join(directory, `${iconSet}.svg`);
    const mapping = require(path.join(
      root,
      "src",
      iconSet,
      "template",
      "mapping.json"
    ));

    const result = spawnSync(
      process.execPath,
      [
        script,
        "--outDir",
        directory,
        "--iconSet",
        iconSet,
        "--outFile",
        path.basename(output),
      ],
      { cwd: root, encoding: "utf8" }
    );

    assert.equal(result.status, 0, result.stderr);
    const sprite = fs.readFileSync(output, "utf8");
    const ids = [...sprite.matchAll(/<symbol\b[^>]*\bid="([^"]+)"/g)].map(
      (match) => match[1]
    );

    const { validateSpriteIntegrity } = require(script);
    const integrity = validateSpriteIntegrity(sprite, `${iconSet} generated sprite`);

    assert.equal(ids.length, Object.keys(mapping).length);
    assert.deepEqual(new Set(ids), new Set(Object.keys(mapping)));
    assert(integrity.idCount >= ids.length);
  });
}
