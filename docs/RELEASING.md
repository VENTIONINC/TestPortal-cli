# Releasing

The release process for this project is automated via GitHub Actions triggered by tags.

## Release Flow

1. **Merge develop to main**: Ensure all changes are in the `main` branch.

   ```bash
   git checkout main
   git merge develop
   ```

2. **Bump version**: Update `version` in `package.json`.

   ```bash
   # Example: change "version": "1.1.0" to "version": "1.1.1"
   ```

3. **Update lockfile**: Run `npm install` to sync `package-lock.json`.

   ```bash
   npm install
   ```

4. **Commit and Tag**:

   ```bash
   git add package.json package-lock.json
   git commit -m "chore: bump version to X.Y.Z"
   git tag vX.Y.Z
   ```

5. **Push**:

   ```bash
   git push origin main --tags
   ```

6. **Sync develop**: Merge `main` back into `develop` to keep them in sync.
   ```bash
   git checkout develop
   git merge main
   git push origin develop
   ```

## Automation

Once a tag matching `v*` is pushed to the repository, the [Publish CLI to GitHub Packages](.github/workflows/publish.yml) workflow will:

1. Checkout the code.
2. Set up Node.js.
3. Install dependencies.
4. Build the project.
5. Publish the package to GitHub Packages.
