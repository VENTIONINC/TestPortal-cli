# Release Guide

This document describes the recommended release flow for the Test Portal CLI.

## Recommended Flow

1. Update the version in `package.json` on a feature or release branch.
2. Update `package-lock.json` if needed.
3. Open a pull request targeting `main`.
4. Make sure the pull request passes the required checks for this repository.
5. Merge the pull request into `main`.
6. Pull the latest `main` locally and confirm you are on the exact merged commit.
7. Create a Git tag for the new version on that `main` commit.
8. Push the tag to GitHub.
9. Create a GitHub Release from that tag.

## Example

If the new version is `1.1.2`:

```bash
git checkout main
git pull origin main
git tag v1.1.2
git push origin v1.1.2
```

Then create a new GitHub Release for `v1.1.2` in the repository UI.

## Why This Flow Works

This is a normal and widely used workflow.

It follows a few good release practices:

- The version change is reviewed in a pull request before release.
- The release tag is created from the actual commit that reached `main`.
- GitHub Releases are tied to immutable Git tags instead of branch state.

## Best Practice Notes

- Prefer tagging the merge commit on `main`, not the PR branch commit before merge. This ensures the tag points to the exact code that was released.
- Use a consistent tag format. `vX.Y.Z` is the most common choice and works well with release tooling.
- Keep `package.json` version and Git tag aligned. Example: `package.json` = `1.1.2`, tag = `v1.1.2`.
- If release notes matter to your team or users, add a short summary of changes in the GitHub Release.

## Package Publishing

This repository publishes the CLI package through GitHub Actions after a matching Git tag is pushed.

Once a tag matching `v*` is pushed to the repository, the publish workflow builds the project and publishes the package to GitHub Packages.
