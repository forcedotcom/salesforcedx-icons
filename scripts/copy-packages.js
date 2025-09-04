#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Icon sets to process
const iconSets = ['seti-icons', 'sfdx-icons'];

iconSets.forEach(iconSet => {
    const srcPackageJson = path.join(__dirname, '..', 'src', iconSet, 'package.json');
    const distPackageJson = path.join(__dirname, '..', 'dist', iconSet, 'package.json');
    const srcReadme = path.join(__dirname, '..', 'src', iconSet, 'README.md');
    const distReadme = path.join(__dirname, '..', 'dist', iconSet, 'README.md');

    try {
        // Ensure dist directory exists
        const distDir = path.join(__dirname, '..', 'dist', iconSet);
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }

        // Copy package.json to dist folder
        if (fs.existsSync(srcPackageJson)) {
            fs.copyFileSync(srcPackageJson, distPackageJson);
            console.log(`✓ Copied package.json for ${iconSet}`);
        } else {
            console.warn(`⚠ Package.json not found for ${iconSet} at ${srcPackageJson}`);
        }

        // Copy README.md to dist folder
        if (fs.existsSync(srcReadme)) {
            fs.copyFileSync(srcReadme, distReadme);
            console.log(`✓ Copied README.md for ${iconSet}`);
        } else {
            console.warn(`⚠ README.md not found for ${iconSet} at ${srcReadme}`);
        }
    } catch (error) {
        console.error(`✗ Error copying files for ${iconSet}:`, error.message);
    }
});

console.log('Package files copied to dist folders.');
