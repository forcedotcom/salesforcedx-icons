const fs = require("fs");
const path = require("path");
const opts = require("minimist")(process.argv.slice(2));

const outputDirectory = "dist";

fs.rmSync(outputDirectory, { recursive: true, force: true });
console.log(`deleted "${outputDirectory}" folder`);

fs.mkdirSync(outputDirectory);

if (opts.folders) {
  for (const folder of opts.folders.split(",")) {
    fs.mkdirSync(path.join(outputDirectory, folder));
    console.log(`created "${outputDirectory}/${folder}" folder`);
  }
}
