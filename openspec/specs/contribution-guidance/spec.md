# contribution-guidance Specification

## Purpose
TBD - created by archiving change adopt-apache-license-and-file-header-tool. Update Purpose after archive.
## Requirements
### Requirement: Repository SHALL publish contributor guidance for licensing-aligned changes
The repository SHALL publish contributor guidance that explains the minimum workflow expectations for changes made under the Apache 2.0 license.

#### Scenario: Contributor looks for contribution instructions
- **WHEN** a contributor inspects the repository's contribution guidance
- **THEN** the repository SHALL describe the expected validation commands for proposed changes
- **AND** the guidance SHALL identify Apache 2.0 as the license under which contributions are accepted

### Requirement: Contributor guidance SHALL include file header workflow
The contributor guide SHALL explain when contributors are expected to use `npm run new:file` and `npm run headers:add`.

#### Scenario: Contributor creates or backfills supported files
- **WHEN** a contributor follows the repository contribution guide for adding or backfilling supported source files
- **THEN** the guide SHALL instruct them to use the repository header commands so the standard header is applied consistently

