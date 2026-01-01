# Copilot instructions for AdminNAgent

These instructions are written to help an AI coding agent become productive quickly in this repository.

NOTE: the repository currently returned no detectable project files from an automated scan. These instructions therefore emphasize discovery steps and the repository-specific conventions the agent should record when files appear.

What I will look for first

- Project root files: `package.json`, `pyproject.toml`, `requirements.txt`, `setup.py`, `Makefile`, `Dockerfile` — use these to determine language and build system.
- Source folders: `src/`, `app/`, `packages/`, `lib/`, `cmd/` — use these to find entry points and services.
- Configuration: `config/`, `.env`, `*.config.js`, `*.yaml`, `*.yml`.
- Tests: `test/`, `tests/`, `spec/` and test runners (Jest, pytest, Mocha).
- CI: `.github/workflows/**` — look for build and test workflows.

Quick discovery commands (Windows PowerShell)

- List top-level files and sizes:
  Get-ChildItem -Force | Sort-Object Length -Descending | Format-Table Name,Length

- Recursively list likely language files (fast):
  Get-ChildItem -Recurse -Include *.cs,*.ts,*.js,*.py,*.go,*.rs,*.java,*.json,Dockerfile -ErrorAction SilentlyContinue | Select-Object FullName -First 200

- Search for run/build/test scripts in root files:
  Select-String -Path * -Pattern "scripts|pytest|unittest|dotnet|mvn|gradle|make|docker" -SimpleMatch -List

High-value targets to read first

- Any file named `README.md` for project intent and quick run instructions.
- Entrypoint files (e.g., `src/index.js`, `main.py`, `cmd/*`) to understand runtime and service boundaries.
- Dockerfile and CI workflows for required environment and credentials.
- Configuration loader code (search for `dotenv`, `os.environ`, `process.env`, `viper`, `configparser`) to find secrets and runtime flags.

Repository-specific conventions to record (if found)

- Preferred environment file names and locations (e.g., `.env.local`, `config/.env`)
- How secrets/config are injected (CI secrets, mounted volumes, vaults)
- Database connection patterns (ORM used, migration tooling)
- Any mono-repo package layouts or plugin systems (look for `packages/` or `workspace:` in package.json)

How to modify code safely

- Always run the project's tests before changing behavior; if no tests, run a smoke-run (see "Run a smoke-run" below).
- When adding features, prefer small, isolated changes and include unit tests following the project test style.

Run a smoke-run (if no instructions in repo)

- If Node.js detected, run `npm ci; npm test` or `npm run start`.
- If Python detected, create a venv, install requirements, run `pytest`.
- For compiled languages, follow their standard build (dotnet build, go build, mvn package).

Examples of project-specific patterns to capture (use real files when present)

- If the repo uses a `config/` folder with `default.yaml` + `production.yaml`, prefer reading `config/default.yaml` to find feature flags.
- If source files import `logger` from `./lib/logger`, follow that module to learn structured logging fields.

Integration and external dependencies

- Collect third-party services from configuration files (e.g., Redis, PostgreSQL, S3, external APIs).
- Note any SDKs in lockfiles (npm/yarn/pip/pipenv) for versioned integrations.

Editing guidelines for the agent

- Keep changes minimal and focused. If adding tests, follow the same test framework and naming patterns.
- Avoid altering CI/workflow files unless fixing a clear break; instead propose changes in PR description.
- When changing secrets or connection strings, prefer using environment variables and update README with the expected names.

When you are done

- Add a short summary to PR/commit message describing: what you changed, why, how you verified it (test run or smoke-run), and any manual steps remaining.

If you (human) are reviewing

- Point the agent to the main entrypoint (file, package, or the README) if these instructions miss the target.

---

If you'd like, I can refine this file with real examples once you add or point me to the repository files to inspect. Please tell me where the main app or README is if it's outside of the root path I scanned.