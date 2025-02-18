const package = require("./package.json");
const codepoints = require("./../src/seti-icons/template/mapping.json");

module.exports = {
  name: "seti-icons",
  prefix: "seti-icon",
  codepoints: codepoints,
  inputDir: "./icons",
  outputDir: "./../dist/seti-icons",
  fontTypes: ["ttf", "woff2"],
  normalize: true,
  assetTypes: ["css", "html"],
  templates: {
    html: "./template/preview.hbs",
    css: "./template/styles.hbs",
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
