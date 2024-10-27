const fs = require('fs');
var opts = require("minimist")(process.argv.slice(2));

if (!opts.f || typeof opts.f !== "string") {
  console.log("use -f to specify your mapping.json path");
  return;
}


fs.readFile(opts.f, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    try {
        const mapping = JSON.parse(data);

        console.log("/*---------------------------------------------------------------------------------------------");
        console.log(" *  Copyright (c) Microsoft Corporation. All rights reserved.");
        console.log(" *  Licensed under the MIT License. See License.txt in the project root for license information.");
        console.log(" *--------------------------------------------------------------------------------------------*/");
        console.log("import { register } from 'vs/base/common/codiconsUtil';");
        console.log("");
        console.log("");
        console.log("// This file is automatically generated by (microsoft/vscode-codicons)/scripts/export-to-ts.js");
        console.log("// Please don't edit it, as your changes will be overwritten.");
        console.log("// Instead, add mappings to codiconsDerived in codicons.ts.");
        console.log("export const salesforcedx_iconsLibrary = {");

        Object.entries(mapping).forEach(([name, value]) => {
            console.log(`\t${toCamelCase(name)}: register('${name}', ${decimalToHex(value)}),`);
        });

        console.log("} as const;");

    } catch (error) {
        console.error('Error parsing JSON:', error);
    }
});


function toCamelCase(name) {
    return name.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

function decimalToHex(decimal) {
    return '0x' + decimal.toString(16);
}
