const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { assertGlyphMetrics, selectNpmCommand } = require(path.join(
  __dirname,
  "..",
  "scripts",
  "validate-build.js"
));

test("validate-build invokes npm CLI through the current Node executable", () => {
  assert.deepEqual(
    selectNpmCommand({
      execPath: "/opt/node/bin/node",
      npmExecPath: "/opt/node/lib/node_modules/npm/bin/npm-cli.js",
      platform: "linux",
    }),
    {
      command: "/opt/node/bin/node",
      args: ["/opt/node/lib/node_modules/npm/bin/npm-cli.js"],
    }
  );
});

test("validate-build tolerates parser-only floating point noise in glyph bounds", () => {
  assert.doesNotThrow(() =>
    assertGlyphMetrics(
      [300, 65.86666870117188, 65.5, 234.13333333333333, 234.5],
      [300, 65.86666870117188, 65.5, 234.13333333333335, 234.5],
      "glyph metrics"
    )
  );
  assert.throws(
    () => assertGlyphMetrics([300, 0, 0, 10, 10], [300, 0, 0, 11, 10], "glyph metrics"),
    /metric 3/
  );
});

test("validate-build falls back to the platform npm executable", () => {
  assert.deepEqual(
    selectNpmCommand({ npmExecPath: "", platform: "win32" }),
    { command: "npm.cmd", args: [] }
  );
  assert.deepEqual(
    selectNpmCommand({ npmExecPath: "", platform: "linux" }),
    { command: "npm", args: [] }
  );
});
