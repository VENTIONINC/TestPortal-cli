## 1. Repository Licensing Artifacts

- [x] 1.1 Replace the root `LICENSE` file with the standard Apache License 2.0 text
- [x] 1.2 Update `package.json` and `package-lock.json` to declare `Apache-2.0`
- [x] 1.3 Update `README.md` to reference Apache 2.0 and the root `LICENSE` file

## 2. Header Workflow

- [x] 2.1 Add `npm run new:file` and supporting header utility scripts
- [x] 2.2 Add `npm run headers:add` scoped to `src` and `tests`
- [x] 2.3 Run the bulk header backfill across supported files in `src` and `tests`

## 3. Contributor Guidance

- [x] 3.1 Add `CONTRIBUTING.md` with Apache 2.0 and validation guidance
- [x] 3.2 Update `AGENTS.md` to mention the header workflow and license expectations

## 4. Validation

- [x] 4.1 Verify `npm run new:file` success and failure cases
- [x] 4.2 Verify `npm run headers:add` updates supported files and skips already-headered files
- [x] 4.3 Run the repository validation commands before merging
