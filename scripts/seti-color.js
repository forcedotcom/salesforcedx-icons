const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

const colorsFilePath = path.join(
  __dirname,
  "./../src/seti-icons/template/colors.json"
);
const templateFilePath = path.join(
  __dirname,
  "./../src/seti-icons/template/styles-colors.hbs"
);
const outputFilePath = path.join(
  __dirname,
  "./../dist/seti-icons/seti-icons.css"
);

const colors = JSON.parse(fs.readFileSync(colorsFilePath, "utf8"));

// Register the 'color' helper
Handlebars.registerHelper("color", function (key) {
  return colors[key] || "--seti-white";
});

// Load the existing CSS content
let existingCssContent = "";
if (fs.existsSync(outputFilePath)) {
  existingCssContent = fs.readFileSync(outputFilePath, "utf8");
}

// Load and compile the Handlebars template
const templateSource = fs.readFileSync(templateFilePath, "utf8");
const template = Handlebars.compile(templateSource);

// Render the template with the colors data
const newCssContent = template({ colors: colors, prefix: "seti-color" });

// Combine the existing CSS content with the new CSS content
const updatedCssContent = existingCssContent + "\n" + newCssContent;

fs.writeFileSync(outputFilePath, updatedCssContent, "utf8");
console.log(`CSS file generated at ${outputFilePath}`);
