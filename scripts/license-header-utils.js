const fs = require("node:fs");
const path = require("node:path");

const LICENSE_HEADER = [
  "// Copyright 2026 Vention",
  "// SPDX-License-Identifier: Apache-2.0",
].join("\n");

const HEADER_BY_EXTENSION = new Map([
  [".ts", LICENSE_HEADER],
  [".tsx", LICENSE_HEADER],
  [".js", LICENSE_HEADER],
  [".jsx", LICENSE_HEADER],
  [".mjs", LICENSE_HEADER],
  [".cjs", LICENSE_HEADER],
]);

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

function getSupportedExtensions() {
  return Array.from(HEADER_BY_EXTENSION.keys());
}

function getHeaderForExtension(filePath) {
  return HEADER_BY_EXTENSION.get(path.extname(filePath).toLowerCase()) ?? null;
}

function normalizeHeader(header) {
  return `${header}\n\n`;
}

function splitShebang(content) {
  if (!content.startsWith("#!")) {
    return { shebang: "", rest: content };
  }

  const newlineIndex = content.indexOf("\n");
  if (newlineIndex === -1) {
    return { shebang: content, rest: "" };
  }

  return {
    shebang: `${content.slice(0, newlineIndex)}\n`,
    rest: content.slice(newlineIndex + 1),
  };
}

function hasLicenseHeader(content, header) {
  const normalizedHeader = normalizeHeader(header);
  if (content.startsWith(normalizedHeader)) {
    return true;
  }

  const { rest } = splitShebang(content);
  return rest.startsWith(normalizedHeader);
}

function applyHeaderToContent(content, header) {
  const normalizedHeader = normalizeHeader(header);
  if (hasLicenseHeader(content, header)) {
    return content;
  }

  const { shebang, rest } = splitShebang(content);
  if (!shebang) {
    return `${normalizedHeader}${content}`;
  }

  return `${shebang}${normalizedHeader}${rest}`;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

module.exports = {
  DEFAULT_IGNORED_DIRECTORIES,
  HEADER_BY_EXTENSION,
  LICENSE_HEADER,
  applyHeaderToContent,
  ensureParentDirectory,
  fail,
  getHeaderForExtension,
  getSupportedExtensions,
  hasLicenseHeader,
  normalizeHeader,
};
