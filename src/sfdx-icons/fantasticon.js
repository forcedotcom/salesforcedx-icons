const package = require("./../../package.json");
const codepoints = require("./template/mapping.json");

module.exports = {
  name: "sfdx-icons",
  prefix: "sfdx-icon",
  codepoints: codepoints,
  inputDir: "./src/sfdx-icons/icons",
  outputDir: "./dist/sfdx-icons",
  fontTypes: ["ttf", "woff2"],
  normalize: true,
  assetTypes: ["css", "html"],
  templates: {
    html: "./src/sfdx-icons/template/preview.hbs",
    css: "./src/sfdx-icons/template/styles.hbs",
  },
  formatOptions: {
    ttf: {
      url: package.url,
      description: package.description,
      version: package.fontVersion,
    },
    woff2: {
      url: package.url,
      description: package.description,
      version: package.fontVersion,
    },
  },
};
