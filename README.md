# 🚀 test-report-ctrfer

A lightweight **Node.js CLI** utility that ingests test‐report output from popular frameworks (starting with [Playwright](https://playwright.dev/)) and emits a single, normalized **CTRF** (Common Test Results Format) JSON document.

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.x-brightgreen"/>
  <img src="https://img.shields.io/github/license/your-org/test-report-ctrfer"/>
  <img src="https://img.shields.io/badge/status-alpha-orange"/>
</p>

> **Why CTRF?**  Teams often juggle multiple testing tools whose result formats don’t play nicely together. CTRF provides a single schema that downstream dashboards, analytics, or DevOps pipelines can consume without custom parsing.

---

## ✨ Features

* **Universal Input** – Parse Playwright (v1.43+) JSON today; JUnit XML, Mocha, and Jest support are on the roadmap.
* **Zero‑Config CLI** – One command converts reports in place or streams to `stdout`.
* **Deterministic Output** – Guarantees compliance with the [CTRF spec](#ctrf-specification), including run metadata and environment fields.
* **Composable** – Expose a small JavaScript API for programmatic use in build scripts.

---

## 🛠 Installation

```bash
npm install --global test-report-ctrfer   # yarn global add test-report-ctrfer
```

> Requires **Node.js ≥ 18** (for native `fetch` and `fs/promises`).

---

## ⚡️ Quick Start

Convert a Playwright JSON results file and write the CTRF document next to it:

```bash
ctrf-convert --input ./playwright-report.json --type playwright
```

Pipe to `stdout`, then compress:

```bash
ctrf-convert -i results.json -t playwright --stdout | gzip > results.ctrf.json.gz
```

Specify an explicit output path:

```bash
ctrf-convert -i ./e2e/results.json -t playwright -o ./dist/e2e.ctrf.json
```

### ⚙️ CLI Flags

| Flag                | Alias | Description                              | Default                |
| ------------------- | ----- | ---------------------------------------- | ---------------------- |
| `--input <path>`    | `-i`  | Path to the source report                | **required**           |
| `--type <provider>` | `-t`  | Provider name (`playwright`, `junit`, …) | **required**           |
| `--output <path>`   | `-o`  | Write file instead of `stdout`           | *derived from `input`* |
| `--stdout`          |       | Force output to console                  | *false*                |
| `--version`         | `-v`  | Show version                             |                        |
| `--help`            | `-h`  | CLI help                                 |                        |

---

## 📚 Programmatic API

```js
import { convert } from 'test-report-ctrfer';

const ctrfJson = await convert({
  input: './playwright-report.json',
  provider: 'playwright',
});

console.log(JSON.stringify(ctrfJson, null, 2));
```

All conversion options mirror the CLI flags.

---

## 🔖 CTRF Specification

Below is the minimal CTRF schema the converter produces. Additional optional fields (`ci`, `git`, `system`) are emitted when detected.

```jsonc
{
  "results": {
    "tool": {
      "name": "AnyTool"
    },
    "summary": {
      "tests": 1,
      "passed": 1,
      "failed": 0,
      "pending": 0,
      "skipped": 0,
      "other": 0,
      "start": 1706828654274,
      "stop": 1706828655782
    },
    "tests": [
      {
        "name": "API Status code is 200",
        "status": "passed",
        "duration": 801
      }
    ],
    "environment": {
      "appName": "MyApp",
      "buildName": "MyApp",
      "buildNumber": "100"
    }
  }
}
```

Read the full published spec at [https://ctrf.io/](https://ctrf.io).

---

## 🔌 Supported Providers

| Provider       | Status      | Notes                                |
| -------------- | ----------- | ------------------------------------ |
| **Playwright** | ✅ Supported | JSON report format only              |
| JUnit XML      | 🛣️ Planned | Compatible with most Java/JS runners |
| Jest           | 🛣️ Planned | Via `--json` reporter                |
| Mocha          | 🛣️ Planned | Via `--reporter json`                |

Looking for another format? Open an [issue](https://github.com/iharMikailau/test-portal-integration-cli/issues).

---

## 🚀 CI Usage Examples

### GitHub Actions

```yaml
- name: Convert Playwright report to CTRF
  run: |
    npm i -g test-report-ctrfer
    ctrf-convert -i ./playwright-report.json -t playwright -o ${{ github.workspace }}/ctrf.json
```

### GitLab CI

```yaml
convert_report:
  image: node:20
  script:
    - npm install -g test-report-ctrfer
    - ctrf-convert -i report.json -t playwright --stdout > report.ctrf.json
  artifacts:
    paths:
      - report.ctrf.json
```

---

## 🤝 Contributing

1. Fork the repo and create a new branch (`git checkout -b feat/amazing`)
2. Run `npm install`
3. Submit a pull request 🧑‍💻

---

## 📝 License

Licensed under the **MIT License** – see [`LICENSE`](LICENSE) for details.
