// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

const fs = require("fs");
const path = require("path");

const ALLOWED_LICENSES = new Set([
  "(MIT OR CC0-1.0)",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "CC-BY-4.0",
  "ISC",
  "MIT",
  "Python-2.0",
]);

const BLOCKED_LICENSE_PATTERN = /\b(AGPL|GPL|LGPL|UNLICENSED|UNKNOWN)\b/i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getPackageName(lockfilePath) {
  return lockfilePath.replace(/^node_modules\//, "");
}

function resolvePackageLicense(packageName, lockfileLicense) {
  if (lockfileLicense) {
    return lockfileLicense;
  }

  const packageJsonPath = path.join(
    process.cwd(),
    "node_modules",
    packageName,
    "package.json"
  );

  if (!fs.existsSync(packageJsonPath)) {
    return "MISSING";
  }

  const packageJson = readJson(packageJsonPath);

  if (packageJson.license) {
    return packageJson.license;
  }

  if (Array.isArray(packageJson.licenses) && packageJson.licenses.length > 0) {
    return packageJson.licenses
      .map(license => license.type || license)
      .filter(Boolean)
      .join(" OR ");
  }

  return "MISSING";
}

function isAllowedLicense(license) {
  if (!license || license === "MISSING") {
    return false;
  }

  return ALLOWED_LICENSES.has(license) && !BLOCKED_LICENSE_PATTERN.test(license);
}

function main() {
  const lockfile = readJson(path.join(process.cwd(), "package-lock.json"));
  const packages = Object.entries(lockfile.packages || {}).filter(([pkgPath]) =>
    pkgPath.startsWith("node_modules/")
  );

  const licenseCounts = new Map();
  const violations = [];

  for (const [pkgPath, metadata] of packages) {
    const packageName = getPackageName(pkgPath);
    const license = resolvePackageLicense(packageName, metadata.license);
    licenseCounts.set(license, (licenseCounts.get(license) || 0) + 1);

    if (!isAllowedLicense(license)) {
      violations.push({
        name: packageName,
        license,
        scope: metadata.dev ? "dev" : "prod",
      });
    }
  }

  console.log("License summary:");
  for (const [license, count] of [...licenseCounts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    console.log(`  ${license}: ${count}`);
  }

  if (violations.length > 0) {
    console.error("\nDisallowed or missing dependency licenses:");
    for (const violation of violations.sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      console.error(
        `  ${violation.name}: ${violation.license} (${violation.scope})`
      );
    }
    process.exit(1);
  }

  console.log("\nAll dependency licenses are allowed.");
}

main();
