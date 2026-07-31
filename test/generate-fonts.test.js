const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const nodeProcess = require("node:process");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const script = path.join(root, "scripts", "generate-fonts.js");

test("generate-fonts exports compatibility codepoints and canonical mappings", () => {
  const { aliasesFor, COMPATIBILITY_ALIASES } = require(script);

  assert.deepEqual(aliasesFor("seti-icons"), { vite: 0xf101 });
  assert.deepEqual(COMPATIBILITY_ALIASES["seti-icons"], {
    vite: { codepoint: 0xf101, canonical: "vite" },
  });
  assert.deepEqual(aliasesFor("sfdx-icons"), {
    accept: 0xf101,
    explain: 0xf102,
    reject: 0xf103,
  });
  assert.deepEqual(COMPATIBILITY_ALIASES["sfdx-icons"], {
    accept: { codepoint: 0xf101, canonical: "action-accept" },
    explain: { codepoint: 0xf102, canonical: "action-explain" },
    reject: { codepoint: 0xf103, canonical: "action-reject" },
  });
});

test("generate-fonts applies Fantasticon 1 wide-viewBox normalization", () => {
  const { normalizeLegacyViewBox } = require(script);

  assert.match(
    normalizeLegacyViewBox('<svg viewBox="10 20 1200 1000"><path/></svg>'),
    /viewBox="10 -180 1200 1200"/
  );
  const square = '<svg viewBox="0 0 32 32"><path/></svg>';
  assert.equal(normalizeLegacyViewBox(square), square);
  const tall = '<svg viewBox="0 0 20 32"><path/></svg>';
  assert.equal(normalizeLegacyViewBox(tall), tall);
});

test("generate-fonts configures Fantasticon glob for Windows paths", async () => {
  const { configureFantasticonGlob } = require(script);
  const calls = [];
  const originalGlob = async (pattern, options) => {
    calls.push({ pattern, options });
    return [];
  };
  const globModule = { glob: originalGlob };

  const restore = configureFantasticonGlob("win32", () => globModule);
  await globModule.glob("C:\\Temp\\icons\\**\\*.svg", { nodir: true });

  assert.deepEqual(calls, [
    {
      pattern: "C:\\Temp\\icons\\**\\*.svg",
      options: { nodir: true, windowsPathsNoEscape: true },
    },
  ]);
  restore();
  assert.strictEqual(globModule.glob, originalGlob);

  assert.doesNotThrow(() => configureFantasticonGlob("linux", () => globModule)());
  assert.strictEqual(globModule.glob, originalGlob);
});

test("generate-fonts prepares canonical action sources without changing source", () => {
  const { prepareInputDirectory } = require(script);
  const sourceDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "font-source-"));
  const original = '<svg viewBox="0 0 1200 1000"><path/></svg>';
  for (const name of ["accept", "explain", "reject"]) {
    fs.writeFileSync(path.join(sourceDirectory, `${name}.svg`), original);
  }

  const prepared = prepareInputDirectory(sourceDirectory, "sfdx-icons");
  try {
    for (const name of ["accept", "explain", "reject"]) {
      assert.equal(fs.readFileSync(path.join(sourceDirectory, `${name}.svg`), "utf8"), original);
      assert.match(
        fs.readFileSync(path.join(prepared.inputDirectory, `action-${name}.svg`), "utf8"),
        /viewBox="0 -200 1200 1200"/
      );
    }
  } finally {
    fs.rmSync(prepared.temporaryRoot, { recursive: true, force: true });
    fs.rmSync(sourceDirectory, { recursive: true, force: true });
  }
});

test("generate-fonts rejects an unsupported icon set", () => {
  const result = spawnSync(
    nodeProcess.execPath,
    [script, "--iconSet", "missing-icons"],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported --iconSet/);
});
