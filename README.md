# npm-scan

> An interactive, multi-package-manager dependency security scanner for Node.js and Bun projects.

`npm-scan` is a powerful command-line tool designed to audit project dependencies for known security vulnerabilities (CVEs), track published dates, separate direct dependencies from transitive dependencies, and export detailed JSON security reports.

Powered by Google's **Open Source Insights API** (`deps.dev`), `npm-scan` provides real-time vulnerability data, CVSS v3 severity scores, and dependency breakdown across `npm`, `yarn`, `pnpm`, and `bun`.

---

## ✨ Features

- 🌐 **GitHub Repo & Folder Scanning**: Scan any public/accessible GitHub repository URL or any absolute/relative local directory path (`file://`, `/path/to/project`) without needing to navigate into the folder.
- 🔍 **Vulnerability Scanning**: Fetches up-to-date security advisories, CVSS v3 scores, and vulnerability titles using the `deps.dev` API.
- 🎯 **Direct vs. Transitive Detection**: Automatically categorizes packages as **🎯 DIRECT** (`dependencies` / `devDependencies`) or **🔗 TRANSITIVE** (nested sub-dependencies).
- 🗃️ **Multi-Package Manager Support**: Seamlessly detects and parses:
  - **npm** (`package-lock.json`)
  - **Yarn** (`yarn.lock`)
  - **pnpm** (`pnpm-lock.yaml`)
  - **Bun** (`bun.lockb` / `package.json` fallback)
- 💬 **Interactive & Non-Interactive CLI**:
  - **Interactive Mode**: Guided terminal prompts using `inquirer` for command selection, target folder/URL input, cache clearing, and report saving.
  - **Scripting Mode**: Command-line subcommands and flags for automated execution in CI/CD pipelines.
- ⚡ **Smart SHA-256 Caching**: Computes lockfile SHA-256 fingerprints to cache API responses locally (`.npm-scan-cache.json`), preventing redundant network requests.
- 📄 **Exportable Security Reports**: Saves complete or filtered vulnerability reports as structured JSON files for auditing.
- 📅 **Dependency Insights**: Identifies the oldest installed packages to help address technical debt.

---

## 📦 Installation

### Global Installation

Using **npm**:
```bash
npm install -g npm-scan
```

Using **bun**:
```bash
bun install -g npm-scan
```

Using **yarn**:
```bash
yarn global add npm-scan
```

Using **pnpm**:
```bash
pnpm add -g npm-scan
```

### Direct Execution (Without Installing)

```bash
npx npm-scan
# or
bunx npm-scan
```

---

## 🚀 Usage

### 1. Interactive Mode

Run `npm-scan` without any arguments to launch the interactive prompt wizard:

```bash
npm-scan
```

You will be presented with a menu to:
1. **Choose a command**:
   - `Scan dependencies`: Complete security scan of direct and/or transitive dependencies.
   - `List all installed packages and report`: Displays all installed packages across the lockfile.
   - `Generate report for vulnerable packages`: Scans and isolates packages with active security advisories.
   - `Show help`: Displays usage guidance.
2. **Target repository or folder**: Enter a GitHub repo URL (e.g. `https://github.com/expressjs/express`) or local project directory path / `file://` URL (leave blank for current directory).
3. **Clear cache** option.
4. **Direct dependencies only** toggle.
5. **Save report to disk** prompt with custom filename selection.

---

## 2. Command Line Interface (CLI)

```bash
npm-scan <command> [options] [url|path]
```

#### Available Commands

| Command | Description |
| :--- | :--- |
| `scan` | Scans project dependencies for vulnerabilities (scans transitive by default). |
| `all-installed` | Lists all installed packages parsed from the lockfile. |
| `generate-report` | Performs a security scan and displays/saves only vulnerable packages. |
| `help` | Displays help information and usage examples. |

---

### 🎛️ CLI Options & Flags

| Flag | Short / Alias | Description | Default |
| :--- | :--- | :--- | :--- |
| `--url <url\|path>` | `-u`, `--path`, `-p` | GitHub repo URL or local project folder path / `file://` URL. | Current directory (`.`) |
| `--direct-only` | | Restricts scan to direct dependencies in `package.json`. | `false` |
| `--full` | | Includes all direct and transitive dependencies in the scan. | `true` (for `scan`) |
| `--clear-cache` | `--invalidate-cache` | Clears local cache before running the scan. | `false` |
| `--cache-file <path>` | | Path to custom cache file. | `.npm-scan-cache.json` |
| `--save [filename]` | | Saves the scan report to a JSON file on disk. | `security-scan.json` |
| `--help` | `-h` | Shows usage instructions and exit. | |

---

## 💡 Examples

#### Scan a GitHub repository
```bash
npm-scan scan --url https://github.com/expressjs/express
# or positional URL
npm-scan https://github.com/expressjs/express
```

#### Scan a local project directory or file URL
```bash
npm-scan scan --url /Users/ankur/projects/my-app
npm-scan scan --url file:///Users/ankur/projects/my-app
```

#### Scan direct dependencies only
```bash
npm-scan scan --direct-only
```

#### Scan all dependencies (full transitive tree) and clear cache
```bash
npm-scan scan --full --clear-cache
```

#### Generate a vulnerability report for a remote repo and save to JSON
```bash
npm-scan generate-report --url https://github.com/facebook/react --save report.json
```

#### Use a custom cache file location
```bash
npm-scan scan --cache-file .cache/security-cache.json
```

#### List all installed packages in project lockfile
```bash
npm-scan all-installed
```

---

## 📊 JSON Report Output Format

When using `--save` or confirming save in interactive mode, `npm-scan` generates a structured JSON report:

```json
{
  "scanDate": "2026-07-21T21:17:00.000Z",
  "summary": {
    "totalPackages": 420,
    "directDependencies": 5,
    "transitiveDependencies": 415,
    "vulnerablePackages": 1,
    "vulnerableDirect": 0,
    "vulnerableTransitive": 1
  },
  "results": [
    {
      "package": "example-pkg",
      "currentVersion": "1.2.3",
      "dependencyType": "transitive",
      "publishedAt": "2021-05-10T12:00:00Z",
      "isDefault": true,
      "vulnerabilities": [
        {
          "id": "GHSA-xxxx-xxxx-xxxx",
          "title": "Prototype Pollution in example-pkg",
          "severity": "high",
          "cvss": 7.5,
          "summary": "A prototype pollution flaw allows attackers to modify object prototypes..."
        }
      ],
      "vulnerabilityCount": 1
    }
  ]
}
```

---

## 💻 Programmatic Usage (TypeScript / Node.js API)

`npm-scan` exports the `Scanner` class and `main` function for programmatic use in Node.js or TypeScript projects:

```typescript
import Scanner from 'npm-scan';
import type { DependencyResult } from 'npm-scan/dist/types';

const scanner = new Scanner();

// Scan project dependencies
const results: DependencyResult[] = await scanner.scanDependencies(
  './package.json',
  true, // includeTransitive
  { clearCache: false }
);

// Print formatted console report
scanner.generateReport(results);

// Save report to disk
scanner.saveResults(results, 'security-report.json');
```

---

## 🛠️ Development & Building

### Requirements
- **Node.js** >= 18 or **Bun** >= 1.0

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ankur700/npm-scan.git
   cd npm-scan
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Build the CLI executable**:
   ```bash
   bun run build
   ```

4. **Run the test suite**:
   ```bash
   bun run test
   ```

5. **Test locally**:
   ```bash
   bun run check
   # or
   node ./bin/npm-scan.js help
   ```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/ankur700/npm-scan/issues).

### How to Contribute

1. **Fork the Repository**: Click the **Fork** button at the top right of the GitHub repository page.
2. **Clone Your Fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/npm-scan.git
   cd npm-scan
   ```
3. **Create a Working Branch**:
   ```bash
   git checkout -b feature/amazing-feature
   # or for bug fixes:
   git checkout -b fix/issue-description
   ```
4. **Install Dependencies**:
   ```bash
   bun install
   ```
5. **Make Your Changes**: Add your feature or fix in the `src/` directory. Ensure your code follows the strict TypeScript rules.
6. **Build and Test**:
   ```bash
   # Compile TypeScript & bundle
   bun run build

   # Verify the CLI works
   bun run check
   ```
7. **Commit Your Changes**: Use descriptive commit messages.
   ```bash
   git commit -m "feat: add support for custom output format"
   ```
8. **Push to GitHub**:
   ```bash
   git push origin feature/amazing-feature
   ```
9. **Submit a Pull Request (PR)**: Open a PR against the `main` branch of `ankur700/npm-scan` explaining your changes and motivation.

### Guidelines

- Keep code typed strictly in TypeScript.
- Follow existing CLI UX and formatting conventions.
- Ensure error handling is clean and informative.

---

## 📜 License

This project is licensed under the **GPL-3.0-only** License. See the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Ankur Singh**
- GitHub: [@ankur700](https://github.com/ankur700)
