# repository-licensing Specification

## Purpose
TBD - created by archiving change adopt-apache-license-and-file-header-tool. Update Purpose after archive.
## Requirements
### Requirement: Repository SHALL declare Apache 2.0 consistently
The CLI repository SHALL declare Apache 2.0 as its active license consistently across root licensing artifacts, package metadata, and top-level documentation.

#### Scenario: Root license artifacts are present
- **WHEN** a contributor inspects the repository root
- **THEN** the repository SHALL include a `LICENSE` file containing the Apache License 2.0 text
- **AND** the repository SHALL expose Apache 2.0 as the canonical license in its top-level metadata and documentation

#### Scenario: Package metadata is inspected
- **WHEN** a tool or contributor reads `package.json`
- **THEN** the `license` field SHALL be set to the SPDX identifier `Apache-2.0`

