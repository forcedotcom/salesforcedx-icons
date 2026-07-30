const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("node:util");
const {
  DOMParser,
  XMLSerializer,
  onWarningStopParsing,
} = require("@xmldom/xmldom");

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const ALLOWED_ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "defs",
  "linearGradient",
  "stop",
  "style",
  "use",
]);
const ALLOWED_ATTRIBUTES = new Set([
  "baseProfile",
  "class",
  "clip-rule",
  "cx",
  "cy",
  "d",
  "data-name",
  "fill",
  "fill-rule",
  "font-size",
  "font-stretch",
  "font-weight",
  "gradientTransform",
  "gradientUnits",
  "height",
  "href",
  "id",
  "letter-spacing",
  "offset",
  "opacity",
  "preserveAspectRatio",
  "r",
  "rx",
  "ry",
  "stop-color",
  "stroke",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-width",
  "transform",
  "version",
  "viewBox",
  "width",
  "word-spacing",
  "x1",
  "x2",
  "xlink:href",
  "xmlns",
  "xmlns:xlink",
  "y1",
  "y2",
]);
const XML_ID = /^[A-Za-z_][A-Za-z0-9_.:-]*$/;
const INTERNAL_FRAGMENT = /^#([A-Za-z_][A-Za-z0-9_.:-]*)$/;
const INTERNAL_URL = /^url\(\s*(["']?)(#[A-Za-z_][A-Za-z0-9_.:-]*)\1\s*\)$/i;
const INTERNAL_URL_GLOBAL = /url\(\s*(["']?)#([A-Za-z_][A-Za-z0-9_.:-]*)\1\s*\)/gi;
const STATIC_STYLE = /^\s*(?:\.[A-Za-z_][A-Za-z0-9_-]*\s*\{\s*fill\s*:\s*(?:#[0-9a-fA-F]{3,8}|none|currentColor|url\(\s*(["']?)#[A-Za-z_][A-Za-z0-9_.:-]*\1\s*\))\s*;?\s*\}\s*)*$/;

function elementsIn(root) {
  const elements = [];
  const visit = (element) => {
    elements.push(element);
    for (const child of Array.from(element.childNodes || [])) {
      if (child.nodeType === 1) visit(child);
    }
  };
  visit(root);
  return elements;
}

function fail(error) {
  console.error(`Failed to generate SVG sprite: ${error.message}`);
  process.exitCode = 1;
}

function parseSvg(source) {
  const document = new DOMParser({
    onError: onWarningStopParsing,
  }).parseFromString(source, "application/xml");
  const root = document.documentElement;

  if (document.doctype) {
    throw new Error("DOCTYPE and entity declarations are not allowed in SVG");
  }
  if (
    root.nodeName !== "svg" ||
    (root.namespaceURI !== null && root.namespaceURI !== SVG_NAMESPACE) ||
    (root.hasAttribute("xmlns") && root.getAttribute("xmlns") !== SVG_NAMESPACE)
  ) {
    throw new Error("source root element must be <svg> in the SVG namespace");
  }
  return root;
}

function validateSafeSvg(root) {
  const visit = (element) => {
    const elementName = element.localName || element.nodeName;
    if (
      !ALLOWED_ELEMENTS.has(elementName) ||
      (element.namespaceURI !== null && element.namespaceURI !== SVG_NAMESPACE)
    ) {
      throw new Error(`element <${element.nodeName}> is not allowed in SVG`);
    }

    for (const attribute of Array.from(element.attributes || [])) {
      if (attribute.name === "href" || attribute.name === "xlink:href") {
        if (!INTERNAL_FRAGMENT.test(attribute.value)) {
          throw new Error(`external or non-fragment ${attribute.name} is not allowed in SVG`);
        }
      }
      if (!ALLOWED_ATTRIBUTES.has(attribute.name)) {
        throw new Error(`attribute "${attribute.name}" is not allowed in SVG`);
      }
      if (
        attribute.name === "xlink:href" &&
        attribute.namespaceURI !== XLINK_NAMESPACE
      ) {
        throw new Error("xlink:href must use the XLink namespace");
      }
      if (
        attribute.name === "xmlns" &&
        attribute.value !== SVG_NAMESPACE
      ) {
        throw new Error("the SVG namespace declaration is invalid");
      }
      if (
        attribute.name === "xmlns:xlink" &&
        attribute.value !== XLINK_NAMESPACE
      ) {
        throw new Error("the XLink namespace declaration is invalid");
      }

      if (attribute.value.includes("\\")) {
        throw new Error(`CSS escapes in attribute "${attribute.name}" are not allowed in SVG`);
      }
      const urlFunctions = attribute.value.match(/url\s*\([^)]*\)/gi) || [];
      if (urlFunctions.some((value) => !INTERNAL_URL.test(value))) {
        throw new Error(`external URL in attribute "${attribute.name}" is not allowed in SVG`);
      }
    }

    if (elementName === "style") {
      const style = element.textContent || "";
      if (style.includes("\\") || !STATIC_STYLE.test(style)) {
        throw new Error("style content is not an allowed static class fill rule");
      }
    }

    for (const child of Array.from(element.childNodes || [])) {
      if (child.nodeType === 1) visit(child);
    }
  };

  visit(root);
  return root;
}

function symbolFor(mappedName, svg) {
  validateSafeSvg(svg);

  const sourceIds = new Map();
  for (const element of elementsIn(svg)) {
    if (!element.hasAttribute("id")) continue;
    const oldId = element.getAttribute("id");
    if (!XML_ID.test(oldId)) {
      throw new Error(`source ID "${oldId}" is not a valid XML ID`);
    }
    if (sourceIds.has(oldId)) {
      throw new Error(`duplicate source ID "${oldId}" in mapped icon "${mappedName}"`);
    }
    sourceIds.set(oldId, element === svg ? mappedName : `${mappedName}--${oldId}`);
  }

  const symbol = svg.ownerDocument.createElementNS(svg.namespaceURI, "symbol");
  symbol.setAttribute("id", mappedName);

  for (const attribute of Array.from(svg.attributes)) {
    if (attribute.name !== "id") {
      symbol.setAttributeNS(
        attribute.namespaceURI,
        attribute.name,
        attribute.value
      );
    }
  }
  for (const child of Array.from(svg.childNodes)) {
    symbol.appendChild(child.cloneNode(true));
  }

  const resolve = (oldId) => {
    const newId = sourceIds.get(oldId);
    if (!newId) {
      throw new Error(
        `fragment reference "#${oldId}" in mapped icon "${mappedName}" does not resolve inside its symbol`
      );
    }
    return newId;
  };
  const rewriteUrls = (value) =>
    value.replace(INTERNAL_URL_GLOBAL, (_match, quote, oldId) =>
      `url(${quote}#${resolve(oldId)}${quote})`
    );

  for (const element of elementsIn(symbol)) {
    if (element !== symbol && element.hasAttribute("id")) {
      element.setAttribute("id", resolve(element.getAttribute("id")));
    }
    for (const attribute of Array.from(element.attributes || [])) {
      if (attribute.name === "href" || attribute.name === "xlink:href") {
        const match = INTERNAL_FRAGMENT.exec(attribute.value);
        element.setAttributeNS(
          attribute.namespaceURI,
          attribute.name,
          `#${resolve(match[1])}`
        );
      } else if (/url\s*\(/i.test(attribute.value)) {
        element.setAttributeNS(
          attribute.namespaceURI,
          attribute.name,
          rewriteUrls(attribute.value)
        );
      }
    }
    if ((element.localName || element.nodeName) === "style") {
      element.textContent = rewriteUrls(element.textContent || "");
    }
  }

  return new XMLSerializer().serializeToString(symbol);
}

function validateSpriteIntegrity(source, label = "SVG sprite") {
  const root = parseSvg(source);
  const ids = new Map();
  const owningSymbols = new Map();
  let referenceCount = 0;

  const visit = (element, symbol) => {
    const currentSymbol = (element.localName || element.nodeName) === "symbol"
      ? element
      : symbol;
    owningSymbols.set(element, currentSymbol);
    if (element.hasAttribute("id")) {
      const id = element.getAttribute("id");
      if (ids.has(id)) {
        throw new Error(`${label} contains duplicate ID "${id}"`);
      }
      ids.set(id, { element, symbol: currentSymbol });
    }
    for (const child of Array.from(element.childNodes || [])) {
      if (child.nodeType === 1) visit(child, currentSymbol);
    }
  };
  visit(root, null);

  const assertLocalReference = (oldId, element) => {
    referenceCount += 1;
    const target = ids.get(oldId);
    if (!target) {
      throw new Error(`${label} fragment reference "#${oldId}" does not resolve`);
    }
    const sourceSymbol = owningSymbols.get(element);
    if (!sourceSymbol || target.symbol !== sourceSymbol) {
      throw new Error(
        `${label} fragment reference "#${oldId}" resolves outside its symbol`
      );
    }
  };

  for (const element of elementsIn(root)) {
    for (const attribute of Array.from(element.attributes || [])) {
      if (attribute.name === "href" || attribute.name === "xlink:href") {
        const match = INTERNAL_FRAGMENT.exec(attribute.value);
        if (!match) {
          throw new Error(`${label} contains non-fragment ${attribute.name}`);
        }
        assertLocalReference(match[1], element);
      }
      for (const match of attribute.value.matchAll(INTERNAL_URL_GLOBAL)) {
        assertLocalReference(match[2], element);
      }
    }
    if ((element.localName || element.nodeName) === "style") {
      for (const match of (element.textContent || "").matchAll(INTERNAL_URL_GLOBAL)) {
        assertLocalReference(match[2], element);
      }
    }
  }

  return { idCount: ids.size, referenceCount };
}

function sourceForMappedName(iconsDirectory, mappedName) {
  const candidates = [mappedName];
  if (mappedName.startsWith("action-")) {
    candidates.push(mappedName.slice("action-".length));
  }

  for (const candidate of candidates) {
    const file = path.join(iconsDirectory, `${candidate}.svg`);
    if (fs.existsSync(file)) return file;
  }
  throw new Error(`source SVG not found for mapped icon "${mappedName}"`);
}

function readOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      outDir: { type: "string" },
      iconSet: { type: "string" },
      outFile: { type: "string" },
    },
    strict: true,
  });
  for (const option of ["outDir", "iconSet", "outFile"]) {
    if (!values[option]) throw new Error(`--${option} is required`);
  }
  return values;
}

function main(args = process.argv.slice(2)) {
  const options = readOptions(args);
  const iconSetDirectory = path.join(__dirname, "..", "src", options.iconSet);
  const iconsDirectory = path.join(iconSetDirectory, "icons");
  const mappingFile = path.join(iconSetDirectory, "template", "mapping.json");
  const mapping = JSON.parse(fs.readFileSync(mappingFile, "utf8"));
  const symbols = Object.keys(mapping).map((mappedName) => {
    const sourceFile = sourceForMappedName(iconsDirectory, mappedName);
    return symbolFor(mappedName, parseSvg(fs.readFileSync(sourceFile, "utf8")));
  });
  const sprite = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg">',
    ...symbols,
    "</svg>",
  ].join("");
  validateSpriteIntegrity(sprite, `${options.iconSet} sprite`);

  fs.mkdirSync(path.resolve(options.outDir), { recursive: true });
  fs.writeFileSync(path.resolve(options.outDir, options.outFile), sprite);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    fail(error);
  }
}

module.exports = {
  main,
  parseSvg,
  symbolFor,
  validateSafeSvg,
  validateSpriteIntegrity,
};
