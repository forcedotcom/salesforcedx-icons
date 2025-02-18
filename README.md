# Salesforce DX Icons

This repository generates two icon font families used in Visual Studio Code extensions: SFDX icons (Salesforce DX Icons) for Salesforce-specific features, Seti for file type indicators, and Codicons for UI elements and actions.

Seti icons appear next to file names in the editor tab, indicating the file type based on programming language and extension (e.g., "javascript" for ".js" or ".mjs" files). These icons and their colors come from the [Seti UI Theme repository](https://github.com/jesseweed/seti-ui). The generated icon font can be found in the [VS Code repository](https://github.com/microsoft/vscode/blob/main/extensions/theme-seti/icons/seti.woff).

For more information about Codicons, [see here](https://github.com/microsoft/vscode-codicons).

Unlike Codicons which can be installed via npm, Seti icons aren't directly accessible in webviews and must be manually included. This repository follows the same usage pattern as Codicons to provide consistent implementation across all three icon fonts (SFDX, Seti, and Codicons).

## Using the Icons

**SFDX Icons**

```html
<i class="sfdx-icon sfdx-icon-lightning"></i>
```

**Seti Icons**

```html
<i class="seti-icon seti-icon-apex seti-color-cls"></i>
```

> **Note:** Seti has two values passed in the class name. One for language and one for the file extension, so `javascript` gives you the right icon, and `js` gives you the right color.

**Codicons**

```html
<i class="codicon codicon-add"></i>
```

## Building the Icons

1. **Clone the repository:**

   ```sh
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Build the icons:**

   ```sh
   npm run install
   npm run build
   ```

3. **Generated Assets**

   The generated assets will be available in the `dist` directory of each folder. This includes the icon fonts (.ttf, .woff2), CSS, HTML preview, and other related files. Open the generated HTML preview file in the `dist` directory to see all the icons and their names. You can search for icons by name or description. Clicking on the icon will copy the name of the icon.

## Adding the Icons to a Project

To use the generated icon font in your project, include the CSS file and use the icon classes as follows:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Icon Example</title>
    <link rel="stylesheet" href="path/to/generated/css/file.css" />
  </head>
  <body>
    <i class="seti-icon seti-icon-apex seti-color-cls"></i>
    <i class="sfdx-icon sfdx-icon-lightning"></i>
  </body>
</html>
```

Replace `path/to/generated/css/file.css` with the actual path to the generated CSS file in the `dist` directory. The icon classes `seti-icon-apex, sfdx-icon-lightning` etc. correspond to the icons defined in the mapping files.

> _! Notice that the seti icons have two properties in the class name, one for the language "apex" and one for the file extension "cls". The name of the language gives you the right icon and the extension gives you the right color._

In your webview, depending on how you have things setup, you may need to move the `@font-face` definition out of the generated css file and add it to your `Provider` where you resolve your Webview. This could look something like this:

```html
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${cspString}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${prodStyleTag}
    <style>
      @font-face {
        font-family: "sfdx-icons";
        src: url("${sfdxIconsUri}") format("woff2");
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: "seti-icons";
        src: url("${setiIcontUri}") format("woff2");
        font-weight: normal;
        font-style: normal;
      }
    </style>
    <title>AgentForce: Test Generation</title>
  </head>
  <body>
    <div id="root"></div>
    ${reactRefreshScript}
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>
```

## Scripts Included

**Clean:** Clears the dist directory.

```
npm run clean
```

**Optimize SVGs:** Optimizes the SVG files in the src/icons directory.

```
npm run svgo
```

**Generate Sprite:** Generates an SVG sprite from the icons.

```
npm run sprite
```

**Export to TypeScript:** Exports the icon mappings to a TypeScript file.

```
npm run export-ts
```

**Export to CSV:** Exports the icon mappings to a CSV file.

```
npm run export-csv
```

**Build:** Runs all the necessary steps to generate the final assets.

```
npm run build
```

<br>

### How to Update the SFDX Icon Font

> _You should only need to update the sfdx-icons, seti-icons will only be updated if there is a change in VSCode._

To add new SVG icons to the SFDX icon font, follow these steps:

1. **Add the SVG File**

   Place your new SVG file in the `src/sfdx-icons/icons` directory.

2. **Update the Icon Mapping**

   Update the icon mapping file (`src/sfdx-icons/mapping.json`) to include your new icon. Add an entry for your icon with the SVG name and a codepoint value incremented by one from the last entry. The key must match the name of the svg.

   ```json
   {
     "new-svg-name": "59656"
   }
   ```

   If the last codepoint in the file is `59655`, the new codepoint should be `59656`. This ensures the unicode characters for each icon remain unique and consistent.

3. **Update the Preview Handlebars file**

   Update the preview HBS file (`src/sfdx-icons/template/preview.hbs`) to include the new icon with its name and description. Add an entry in the descriptions variable.

   ```js
   {
        name: 'svg-name',
        description: 'description of the icon'
    },
   ```

4. **Build the Icons**

   Run the build script to regenerate the icon fonts and other assets with your new SVG included.

   ```sh
   npm run build
   ```

5. **Verify the New Icon**

   Open the generated HTML preview file in the `dist/sfdx-icons` directory to verify that your new icon appears correctly. You can search for the icon by name or description.
