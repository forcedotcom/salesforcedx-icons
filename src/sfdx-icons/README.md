# @salesforce/sfdx-icons

Salesforce DX icon font for Visual Studio Code extensions. This package contains the SFDX icon font family used for Salesforce-specific features and functionality.

## Installation

```bash
npm install @salesforce/sfdx-icons
```

## Usage

### CSS Classes

Include the CSS file in your project:

```typescript
import "@salesforce/sfdx-icons/sfdx-icons.css";
```

Use the icon classes in your HTML:

```html
<i class="sfdx-icon sfdx-icon-lightning"></i>
<i class="sfdx-icon sfdx-icon-apex"></i>
```

### TypeScript Library

Import the icon library for programmatic access:

```typescript
import { sfdxIcons } from "@salesforce/sfdx-icons/sfdx-iconsLibrary";

// Use the icon mappings
console.log(sfdxIcons.lightning); // Returns the unicode character for lightning icon
```

### Font Files

The package includes font files in multiple formats:

- `sfdx-icons.ttf` - TrueType font
- `sfdx-icons.woff2` - Web Open Font Format 2.0
- `sfdx-icons.svg` - SVG sprite

## Icon Classes

SFDX icons use a single class pattern:

- `sfdx-icon sfdx-icon-<icon-name>` (e.g., `sfdx-icon sfdx-icon-lightning`)

## License

BSD-3-Clause
