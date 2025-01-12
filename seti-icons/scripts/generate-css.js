const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const colorsFilePath = path.join(__dirname, '../src/template/colors.json');
const templateFilePath = path.join(__dirname, '../src/template/styles-colors.hbs');
const outputFilePath = path.join(__dirname, '../dist/colors.css');

const colors = JSON.parse(fs.readFileSync(colorsFilePath, 'utf8'));

// Register the 'color' helper
Handlebars.registerHelper('color', function(key) {
    return colors[key] || 'seti-color-default';
});

const templateSource = fs.readFileSync(templateFilePath, 'utf8');
const template = Handlebars.compile(templateSource);

const cssContent = template({ colors: colors, prefix: 'seti-color' });

fs.writeFileSync(outputFilePath, cssContent, 'utf8');
console.log(`CSS file generated at ${outputFilePath}`);
