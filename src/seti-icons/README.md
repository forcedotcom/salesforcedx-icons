# @salesforce/seti-icons

Seti file type icon font for Visual Studio Code extensions. This package contains the Seti icon font family used to indicate file types based on programming language and extension.

## Installation

```bash
npm install @salesforce/seti-icons
```

## Usage

### CSS Classes

Include the CSS file in your project:

```typescript
import "@salesforce/seti-icons/seti-icons.css";
```

Use the icon classes in your HTML:

```html
<i class="seti-icon seti-icon-apex seti-color-cls"></i>
<i class="seti-icon seti-icon-javascript seti-color-js"></i>
```

### TypeScript Library

Import the icon library for programmatic access:

```typescript
import { setiIcons } from "@salesforce/seti-icons/seti-iconsLibrary";

// Use the icon mappings
console.log(setiIcons.apex); // Returns the unicode character for apex icon
```

### Font Files

The package includes font files in multiple formats:

- `seti-icons.ttf` - TrueType font
- `seti-icons.woff2` - Web Open Font Format 2.0
- `seti-icons.svg` - SVG sprite

## Icon Classes

Seti icons use two classes:

1. Language class (e.g., `seti-icon-apex`) - determines the icon shape
2. Color class (e.g., `seti-color-cls`) - determines the icon color based on file extension

## License

BSD-3-Clause
