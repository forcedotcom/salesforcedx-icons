const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const script = path.resolve(__dirname, "..", "scripts", "reset.js");

test("reset removes dist contents and recreates requested package folders", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "icons-reset-"));
  fs.mkdirSync(path.join(cwd, "dist", "stale"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "dist", "stale", "asset.txt"), "stale");

  const result = spawnSync(
    process.execPath,
    [script, "--folders", "seti-icons,sfdx-icons"],
    { cwd, encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readdirSync(path.join(cwd, "dist")).sort(), [
    "seti-icons",
    "sfdx-icons",
  ]);
  assert.match(result.stdout, /deleted "dist" folder/);
  assert.match(result.stdout, /created "dist\/seti-icons" folder/);
});
