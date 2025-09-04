#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building icon fonts...');
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed successfully');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

const iconSets = ['seti-icons', 'sfdx-icons'];
const packResults = [];

console.log('\n📦 Creating local packages...');

iconSets.forEach(iconSet => {
    const distDir = path.join(__dirname, '..', 'dist', iconSet);

    try {
        // Change to dist directory and create package
        process.chdir(distDir);
        const result = execSync('npm pack', { encoding: 'utf8' });
        const tarballName = result.trim();

        console.log(`✅ Created: ${tarballName}`);

        // Store full path for install instructions
        const fullPath = path.join(distDir, tarballName);
        packResults.push({
            iconSet,
            tarball: tarballName,
            fullPath
        });

    } catch (error) {
        console.error(`❌ Failed to pack ${iconSet}:`, error.message);
    }
});

// Return to project root
process.chdir(path.join(__dirname, '..'));

console.log('\n🎉 Local packages created successfully!');
console.log('\n📋 To install in your other project, run:');
console.log('─'.repeat(60));

packResults.forEach(({ iconSet, fullPath }) => {
    console.log(`npm install ${fullPath}`);
});

console.log('\n💡 Or copy these paths to add to package.json:');
console.log('─'.repeat(60));

packResults.forEach(({ iconSet, fullPath }) => {
    const packageName = iconSet === 'seti-icons' ? '@salesforce/seti-icons' : '@salesforce/sfdx-icons';
    console.log(`"${packageName}": "file:${fullPath}"`);
});

console.log('\n🔄 To rebuild and repack, just run: npm run pack-local');
