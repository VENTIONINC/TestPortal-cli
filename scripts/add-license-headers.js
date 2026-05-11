const fs = require("node:fs");
const path = require("node:path");

const {
  DEFAULT_IGNORED_DIRECTORIES,
  applyHeaderToContent,
  getHeaderForExtension,
  getSupportedExtensions,
  hasLicenseHeader,
} = require("./license-header-utils.js");

const TARGET_DIRECTORIES = ["src", "tests"];

function walkDirectory(directoryPath, collectedPaths) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  entries.forEach((entry) => {
    if (entry.isDirectory()) {
      if (DEFAULT_IGNORED_DIRECTORIES.has(entry.name)) {
        return;
      }

      walkDirectory(path.join(directoryPath, entry.name), collectedPaths);
      return;
    }

    const absolutePath = path.join(directoryPath, entry.name);
    if (getHeaderForExtension(absolutePath)) {
      collectedPaths.push(absolutePath);
    }
  });
}

const rootDirectory = process.cwd();
const targetFiles = [];

TARGET_DIRECTORIES.forEach((relativeDirectory) => {
  const absoluteDirectory = path.join(rootDirectory, relativeDirectory);

  if (!fs.existsSync(absoluteDirectory)) {
    return;
  }

  walkDirectory(absoluteDirectory, targetFiles);
});

let updatedCount = 0;
let skippedCount = 0;

targetFiles.forEach((targetFile) => {
  const header = getHeaderForExtension(targetFile);

  if (!header) {
    skippedCount += 1;
    return;
  }

  const currentContent = fs.readFileSync(targetFile, "utf8");

  if (hasLicenseHeader(currentContent, header)) {
    skippedCount += 1;
    return;
  }

  fs.writeFileSync(targetFile, applyHeaderToContent(currentContent, header), "utf8");
  updatedCount += 1;
  console.log(`Updated ${path.relative(rootDirectory, targetFile)}`);
});

console.log(
  `Processed ${targetFiles.length} supported files. Added headers to ${updatedCount}; skipped ${skippedCount}.`,
);
console.log(`Supported extensions: ${getSupportedExtensions().join(", ")}`);
console.log(`Scoped directories: ${TARGET_DIRECTORIES.join(", ")}`);
