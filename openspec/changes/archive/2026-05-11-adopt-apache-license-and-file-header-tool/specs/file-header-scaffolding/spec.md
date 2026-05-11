## ADDED Requirements

### Requirement: Repository SHALL provide a headered file creation command
The repository SHALL provide an npm command named `new:file` that creates a new file at a caller-supplied path for supported file types.

#### Scenario: Command is invoked with a valid new path
- **WHEN** a developer runs `npm run new:file -- <path>` with a supported file path that does not already exist
- **THEN** the command SHALL create any missing parent directories
- **AND** the command SHALL create the target file at the requested path

#### Scenario: Command is invoked without a path
- **WHEN** a developer runs `npm run new:file` without providing a target path
- **THEN** the command SHALL fail with a clear usage error
- **AND** the command SHALL not create any files

### Requirement: Repository SHALL provide a bulk header backfill command
The repository SHALL provide a command that scans supported files under `src` and `tests` and prepends the standard Apache 2.0 header when it is missing.

#### Scenario: Bulk backfill is run
- **WHEN** a developer runs the repository bulk header command
- **THEN** the command SHALL scan supported files under `src` and `tests`
- **AND** the command SHALL add the standard header only to supported files that do not already contain it
- **AND** the command SHALL leave already-headered supported files unchanged
