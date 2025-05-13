const package = require("./../../package.json");
const codepoints = require("./template/mapping.json");

module.exports = {
  name: "seti-icons",
  prefix: "seti-icon",
  codepoints: codepoints,
  inputDir: "./src/seti-icons/icons",
  outputDir: "./dist/seti-icons",
  fontTypes: ["woff2", "ttf"],
  normalize: true,
  assetTypes: ["css", "html"],
  templates: {
    html: "./src/seti-icons/template/preview.hbs",
    css: "./src/seti-icons/template/styles.hbs",
  },
  formatOptions: {
    woff2: {
      url: package.url,
      description: package.description,
      version: package.fontVersion,
    },
  },
};
