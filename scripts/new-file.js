const fs = require('node:fs');
const path = require('node:path');

const {
  ensureParentDirectory,
  fail,
  getHeaderForExtension,
  getSupportedExtensions,
  normalizeHeader,
} = require('./license-header-utils');

const targetArg = process.argv[2];

if (!targetArg) {
  fail('Usage: npm run new:file -- <path>');
}

const targetPath = path.resolve(process.cwd(), targetArg);
const extension = path.extname(targetPath).toLowerCase();
const header = getHeaderForExtension(targetPath);

if (!header) {
  const supportedExtensions = getSupportedExtensions().join(', ');
  fail(
    `Unsupported extension '${extension || '(none)'}'. Supported extensions: ${supportedExtensions}`
  );
}

if (fs.existsSync(targetPath)) {
  fail(`File already exists: ${targetArg}`);
}

ensureParentDirectory(targetPath);
fs.writeFileSync(targetPath, normalizeHeader(header), 'utf8');

console.log(`Created ${path.relative(process.cwd(), targetPath)}`);
