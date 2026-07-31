const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const iconSets = ["seti-icons", "sfdx-icons"];

function runNode(args, outputFile) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    stdio: outputFile ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(args[0])} exited with status ${result.status}`);
  }
  if (outputFile) fs.writeFileSync(outputFile, result.stdout);
}

function commandFor(operation, iconSet) {
  const source = path.join(root, "src", iconSet);
  const output = path.join(root, "dist", iconSet);
  switch (operation) {
    case "svgo":
      return {
        args: [
          path.resolve(path.dirname(require.resolve("svgo")), "..", "bin", "svgo.js"),
          "-f",
          path.join(source, "icons"),
          "--config",
          path.join(root, "svgo.config.js"),
        ],
      };
    case "fonts":
      return {
        args: [path.join(__dirname, "generate-fonts.js"), "--iconSet", iconSet],
      };
    case "export-ts":
      return {
        args: [
          path.join(__dirname, "export-ts.js"),
          "-f",
          path.join(source, "template", "mapping.json"),
        ],
        outputFile: path.join(output, `${iconSet}Library.ts`),
      };
    case "export-csv":
      return {
        args: [
          path.join(__dirname, "export-csv.js"),
          "-f",
          path.join(output, `${iconSet}.ttf`),
          "--mapping",
          path.join(source, "template", "mapping.json"),
        ],
        outputFile: path.join(output, `${iconSet}.csv`),
      };
    case "sprite":
      return {
        args: [
          path.join(__dirname, "svg-sprite.js"),
          "--outDir",
          output,
          "--iconSet",
          iconSet,
          "--outFile",
          `${iconSet}.svg`,
        ],
      };
    default:
      throw new Error(`unsupported operation "${operation || ""}"`);
  }
}

function main(args = process.argv.slice(2)) {
  if (args.length !== 1) throw new Error("exactly one operation is required");
  for (const iconSet of iconSets) {
    const command = commandFor(args[0], iconSet);
    runNode(command.args, command.outputFile);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Failed to run icon-set operation: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { commandFor, main, runNode };
