# SFDX and Seti Icons for VSCode Webviews

This repository contains the source code and configuration for generating icon fonts for SFDX (Salesforce DX) and Seti icons. The icons are used in VSCode extensions.

### How to Use

1. **Clone the Repository**

   ```sh
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**

   ```sh
   yarn install
   ```

3. **Build the Icons**

   Run the build script to generate the icon fonts and other assets\*\*

   ```sh
   yarn build
   ```

4. **Generated Assets**

   The generated assets will be available in the `dist` directory. This includes the icon fonts (.ttf, .woff2), CSS, HTML preview, and other related files.

5. **Preview Icons**

   Open the generated HTML preview file in the `dist` directory to see all the icons and their names. You can search for icons by name or description. Clicking on the icon will copy the name of the icon.

### Example Usage in a Project

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
    <i class="seti-icon seti-icon-apex seti-icon-ext-cls"></i>
    <i class="salesforcedx-icon salesforcedx-icon-lightning"></i>
  </body>
</html>
```

Replace `path/to/generated/css/file.css` with the actual path to the generated CSS file in the `dist` directory. The icon classes `seti-icon-apex, salesforcedx-icon-lightning` etc. correspond to the icons defined in the mapping files.

> _! Notice that the seti icons have two declarations, one for the language "apex" and one for the file extension "cls". The name of the language gives you the right icon and the extension gives you the right color._

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
        font-family: "salesforcedx-icons";
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
`;
```

_! Notice that the seti icons have two declarations, one for the language "apex" and one for the file extension "cls". The name of the language gives you the right icon and the extension gives you the right color._

### Scripts

Clean: Clears the dist directory.

```
yarn clean
```

Optimize SVGs: Optimizes the SVG files in the src/icons directory.

```
yarn svgo
```

Generate Sprite: Generates an SVG sprite from the icons.

```
yarn sprite
```

Export to TypeScript: Exports the icon mappings to a TypeScript file.

```
yarn export-to-ts
```

Export to CSV: Exports the icon mappings to a CSV file.

```
yarn export-to-csv
```

Build: Runs all the necessary steps to generate the final assets.

```
yarn build
```

### How to Add New SVGs to the Icon Font

> _You should only need to update the salesforcedx-icons, seti-icons will only be updated if there is a change in vscode._

To add new SVG icons to the icon font, follow these steps:

1. **Add the SVG File**

   Place your new SVG file in the `src/icons` directory.

2. **Optimize the SVG**

   Run the optimization script to ensure the SVG is properly formatted and optimized for use in the icon font.

   ```sh
   yarn svgo
   ```

3. **Update the Icon Mapping**

   Update the icon mapping file (`src/mapping.json`) to include your new icon. Add an entry for your icon with the SVG name and a codepoint value incremented by one from the last entry. The key must match the name of the svg.

   ```json
   {
     "new-svg-name": "59656"
   }
   ```

   If the last codepoint in the file is `59655`, the new codepoint should be `59656`. This ensures the unicode characters for each icon remain unique and consistent.

4. **Update the Preview Handlebars file**

   Update the preview HBS file (`src/template/preview.hbs`) to include the new icon with its name and description. Add an entry in the descriptions variable.

   ```js
   {
        name: 'svg-name',
        description: 'description of the icon'
    },
   ```

5. **Build the Icons**

   Run the build script to regenerate the icon fonts and other assets with your new SVG included.

   ```sh
   yarn build
   ```

6. **Verify the New Icon**

   Open the generated HTML preview file in the `dist` directory to verify that your new icon appears correctly. You can search for the icon by name or description.
