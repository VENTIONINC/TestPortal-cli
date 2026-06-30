const fs = require('node:fs');
const path = require('node:path');

const LICENSE_HEADER = [
  '// Copyright 2026 VENSOLUTIONSGROUP LTD',
  '// SPDX-License-Identifier: Apache-2.0',
].join('\n');

const LEGACY_LICENSE_HEADERS = [
  ['// Copyright 2026 Vention', '// SPDX-License-Identifier: Apache-2.0'].join(
    '\n'
  ),
];

const HEADER_BY_EXTENSION = new Map([
  ['.ts', LICENSE_HEADER],
  ['.tsx', LICENSE_HEADER],
  ['.js', LICENSE_HEADER],
  ['.jsx', LICENSE_HEADER],
  ['.mjs', LICENSE_HEADER],
  ['.cjs', LICENSE_HEADER],
]);

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
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
  if (!content.startsWith('#!')) {
    return { shebang: '', body: content };
  }

  const lineEndIndex = content.indexOf('\n');

  if (lineEndIndex === -1) {
    return { shebang: `${content}\n`, body: '' };
  }

  return {
    shebang: content.slice(0, lineEndIndex + 1),
    body: content.slice(lineEndIndex + 1),
  };
}

function getHeaderBody({ shebang, body }) {
  if (shebang && body.startsWith('\n')) {
    return body.slice(1);
  }

  return body;
}

function hasLicenseHeader(content, header) {
  const parts = splitShebang(content);
  return getHeaderBody(parts).startsWith(normalizeHeader(header));
}

function replaceLegacyLicenseHeader(content, header) {
  const parts = splitShebang(content);
  const body = getHeaderBody(parts);

  for (const legacyHeader of LEGACY_LICENSE_HEADERS) {
    const normalizedLegacyHeader = normalizeHeader(legacyHeader);

    if (body.startsWith(normalizedLegacyHeader)) {
      return `${parts.shebang}${normalizeHeader(header)}${body.slice(
        normalizedLegacyHeader.length
      )}`;
    }
  }

  return null;
}

function addLicenseHeader(content, header) {
  const parts = splitShebang(content);
  return `${parts.shebang}${normalizeHeader(header)}${getHeaderBody(parts)}`;
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
  LICENSE_HEADER,
  LEGACY_LICENSE_HEADERS,
  addLicenseHeader,
  ensureParentDirectory,
  fail,
  getHeaderForExtension,
  getSupportedExtensions,
  hasLicenseHeader,
  normalizeHeader,
  replaceLegacyLicenseHeader,
};
