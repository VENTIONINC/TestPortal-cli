# Security Audit Report

**Date:** 2026-02-06
**Project:** test-portal-integration-cli
**Version:** 1.1.1

## Executive Summary

This security audit was performed to identify vulnerabilities in the project's dependencies. The audit revealed **5 vulnerabilities** across 3 high severity, 1 moderate severity, and 1 low severity issue.

### Vulnerability Summary

| Severity  | Count |
| --------- | ----- |
| Critical  | 0     |
| High      | 3     |
| Moderate  | 1     |
| Low       | 1     |
| **Total** | **5** |

### Total Dependencies

- Production: 35 packages
- Development: 429 packages
- Optional: 2 packages
- **Total:** 466 packages

## Critical & High Severity Vulnerabilities

### 1. axios - Denial of Service via Lack of Data Size Check (HIGH)

**CVE:** GHSA-4hjh-wcwx-xvwj
**Advisory ID:** 1112195
**Current Version:** 1.10.0
**Fixed Version:** 1.12.0
**CVSS Score:** 7.5 (High)
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)

**Description:**
Axios is vulnerable to DoS attack through lack of data size check. An attacker can exploit this vulnerability by sending malicious data that causes excessive resource consumption, leading to service unavailability.

**Impact:**

- Confidentiality: NONE
- Integrity: NONE
- Availability: HIGH

**Fix Available:** Yes (version 1.12.0 or later)

**OWASP Reference:** [A05:2021 – Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)

---

### 2. fast-xml-parser - RangeError DoS Numeric Entities Bug (HIGH)

**CVE:** GHSA-37qj-frw5-hhjh
**Advisory ID:** 1112708
**Current Version:** 5.3.2
**Fixed Version:** 5.3.4
**CVSS Score:** 7.5 (High)
**CWE:** CWE-248 (Uncaught Exception)

**Description:**
fast-xml-parser has RangeError DoS bug related to numeric entities. Maliciously crafted XML input with specific numeric entity patterns can trigger unhandled exceptions, causing the application to crash.

**Impact:**

- Confidentiality: NONE
- Integrity: NONE
- Availability: HIGH

**Fix Available:** Yes (version 5.3.4 or later)

**OWASP Reference:** [A05:2021 – Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)

---

### 3. glob - Command Injection via CLI (HIGH)

**CVE:** GHSA-5j98-mcp5-4vw2
**Advisory ID:** 1109842
**Current Version:** 10.4.5 (transitive dependency via rimraf)
**Fixed Version:** 10.5.0
**CVSS Score:** 7.5 (High)
**CWE:** CWE-78 (OS Command Injection)

**Description:**
glob CLI has command injection vulnerability via -c/--cmd flag that executes matches with shell:true. An attacker can execute arbitrary commands by crafting malicious file names that are processed by glob's command execution feature.

**Impact:**

- Confidentiality: HIGH
- Integrity: HIGH
- Availability: HIGH

**Fix Available:** Yes (via rimraf update)

**OWASP Reference:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

---

## Moderate Severity Vulnerabilities

### 4. js-yaml - Prototype Pollution in merge (MODERATE)

**CVE:** GHSA-mh29-5h37-fv8m
**Advisory IDs:** 1112714, 1112715
**Current Version:** Multiple versions < 3.14.2 and 4.0.0 - 4.1.0
**Fixed Version:** 3.14.2 or 4.1.1+
**CVSS Score:** 5.3 (Moderate)
**CWE:** CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes)

**Description:**
js-yaml has prototype pollution vulnerability in the merge function when processing YAML documents with the `<<` (merge) operator. Attackers can inject properties into Object.prototype, potentially affecting application behavior across the entire codebase.

**Impact:**

- Confidentiality: NONE
- Integrity: LOW
- Availability: NONE

**Fix Available:** Yes (transitive dependency, updates available)

**OWASP Reference:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

---

## Low Severity Vulnerabilities

### 5. diff - Denial of Service (LOW)

**CVE:** GHSA-73rr-hh4g-fpgx
**Advisory ID:** 1112704
**Current Version:** 4.0.0 - 4.0.3
**Fixed Version:** 4.0.4
**CVSS Score:** Not rated (LOW)
**CWE:** CWE-400 (Resource Exhaustion), CWE-1333 (ReDoS)

**Description:**
DoS vulnerability in parsePatch and applyPatch functions through regular expression backtracking. An attacker can cause CPU exhaustion by providing specially crafted diff patches that trigger exponential regex backtracking.

**Impact:**

- Availability: LOW (CPU exhaustion, temporary)

**Fix Available:** Yes (version 4.0.4)

**OWASP Reference:** [A04:2021 – Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)

---

## Indirect Dependencies

The following vulnerabilities affect transitive (indirect) dependencies:

- **glob**: Via rimraf (devDependencies)
- **js-yaml**: Via @istanbuljs/load-nyc-config and ts-jest (devDependencies)
- **diff**: Via jest (devDependencies)

---

## Security Best Practices Review

### Current Implementation

The codebase is a CLI tool and library for test report conversion with the following characteristics:

- **Input Validation:** Uses Zod for schema validation
- **HTTP Client:** Axios for webhook delivery with authentication support
- **No Direct User Input Processing:** Operates on file input only
- **No Authentication Layer:** CLI tool, does not expose network endpoints

### Areas of Improvement

1. **Input Validation**

   - Comprehensive validation of test report formats is implemented
   - XML parsing requires secure parser configuration

2. **Dependency Management**

   - Update vulnerable dependencies immediately
   - Implement automated dependency scanning in CI/CD
   - Set up Dependabot or Renovate for automatic updates

3. **File Processing Security**

   - Validate file sizes before processing
   - Implement memory limits for large file handling
   - Sanitize file paths to prevent path traversal

4. **Error Handling**
   - Ensure errors don't leak sensitive information
   - Implement proper logging without exposing internal details

---

## Immediate Actions Required

### Priority 1 (Critical - Update Immediately)

1. Update `axios` from 1.10.0 to 1.13.4

   ```bash
   npm install axios@1.13.4
   ```

2. Update `fast-xml-parser` from 5.3.2 to 5.3.4

   ```bash
   npm install fast-xml-parser@5.3.4
   ```

### Priority 2 (High - Update Within 7 Days)

1. Update `rimraf` to latest version (fixes glob vulnerability)

   ```bash
   npm install -D rimraf@latest
   ```

### Priority 3 (Moderate - Review and Plan)

1. Update dev dependencies to fix js-yaml and diff vulnerabilities

   ```bash
   npm update
   ```

2. Run full test suite after updates

   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```

3. Implement automated security scanning in CI/CD pipeline

---

## Testing Recommendations

After applying security updates, perform the following tests:

1. **Unit Tests:** Run full test suite to ensure no regressions

   ```bash
   npm test
   npm run test:coverage
   ```

2. **Integration Tests:** Test CLI functionality with various input formats

   ```bash
   npm run dev -- -i examples/playwright-example.json -t playwright -o /tmp/output.json
   ```

3. **Build Tests:** Ensure build process works correctly

   ```bash
   npm run clean
   npm run build
   ```

4. **Security Tests:**

   - Test with malformed XML input files
   - Test with extremely large input files
   - Verify error handling doesn't leak paths or internal details

---

## CI/CD Security Integration

### Recommended GitHub Actions Workflow

```yaml
name: Security Audit

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
      - run: npm ci
      - run: npm audit --production --audit-level=high
      - run: npm run test
      - run: npm run lint
```

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [npm Security Advisories](https://www.npmjs.com/advisories)
- [GitHub Advisory Database](https://github.com/advisories)
- [CVE Database](https://cve.mitre.org/)
- [CWE Database](https://cwe.mitre.org/)

---

## Audit Metadata

**Audit Tool:** npm audit v10
**Auditor:** Automated Security Analysis
**Next Review Date:** 2026-03-06 (30 days)
**Dependencies Frozen:** Yes (all versions pinned without caret notation)
**Commercial Use:** Approved (see license-audit.md)
