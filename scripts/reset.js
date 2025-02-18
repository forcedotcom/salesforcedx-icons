const fs = require("fs");
const rimraf = require("rimraf");
const opts = require("minimist")(process.argv.slice(2));

const outputDirectory = "dist";

// clear dist folder
rimraf(outputDirectory, function () {
  console.log(`deleted "${outputDirectory}" folder`);

  // re-create dist folder and subfolders
  fs.mkdirSync(outputDirectory);

  if (opts.folders) {
    const folders = opts.folders.split(",");
    folders.forEach((folder) => {
      fs.mkdirSync(`${outputDirectory}/${folder}`);
      console.log(`created "${outputDirectory}/${folder}" folder`);
    });
  }
});
