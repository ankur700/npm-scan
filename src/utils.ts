import chalk from 'chalk';
import figlet from 'figlet';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import type { DependenciesMap, PackageManager } from './types';

type PromptCommand = 'scan' | 'all-installed' | 'generate-report' | 'help';

interface PromptAnswers {
  command: PromptCommand;
  clearCache?: boolean;
  directOnly?: boolean;
  saveReport?: boolean;
  saveFile?: string;
}

export function renderBanner(): void {
  const banner = figlet.textSync('npm-check', { horizontalLayout: 'default' });
  console.log(chalk.cyanBright(banner));
  console.log(chalk.gray('Interactive dependency security scanner\n'));
}

export async function promptForCommand(): Promise<{ command: string; flags: Record<string, string | boolean> }> {
  const questions = [
    {
      type: 'select' as const,
      name: 'command' as const,
      message: 'Choose a command',
      choices: [
        { name: 'Scan dependencies', value: 'scan' as PromptCommand },
        { name: 'List all installed packages and report', value: 'all-installed' as PromptCommand },
        { name: 'Generate report for vulnerable packages', value: 'generate-report' as PromptCommand },
        { name: 'Show help', value: 'help' as PromptCommand }
      ]
    },
    {
      type: 'confirm' as const,
      name: 'clearCache' as const,
      message: 'Clear previous cache before scanning?',
      default: false,
      when: (answers: PromptAnswers) => answers.command !== 'help'
    },
    {
      type: 'confirm' as const,
      name: 'directOnly' as const,
      message: 'Scan direct dependencies only?',
      default: false,
      when: (answers: PromptAnswers) => answers.command === 'scan'
    },
    {
      type: 'confirm' as const,
      name: 'saveReport' as const,
      message: (answers: PromptAnswers) =>
        answers.command === 'all-installed'
          ? 'Save a full installed package report to disk?'
          : 'Save the report to disk?',
      default: false,
      when: (answers: PromptAnswers) => answers.command !== 'help'
    },
    {
      type: 'input' as const,
      name: 'saveFile' as const,
      message: (answers: PromptAnswers) =>
        answers.command === 'all-installed'
          ? 'Enter filename for the installed package report'
          : 'Enter filename for the report',
      default: (answers: PromptAnswers) =>
        answers.command === 'all-installed'
          ? 'all-installed-report.json'
          : 'security-scan.json',
      when: (answers: PromptAnswers) => answers.saveReport === true
    }
  ] as const;

  const answers = await inquirer.prompt<PromptAnswers>(questions as unknown as any);

  const flags: Record<string, string | boolean> = {};
  if (answers.clearCache) flags['clear-cache'] = true;
  if (answers.directOnly) flags['direct-only'] = true;
  if (answers.saveReport) flags.save = answers.saveFile || (answers.command === 'all-installed' ? 'all-installed-report.json' : 'security-scan.json');

  return { command: answers.command, flags };
}

export async function confirmSave(filename: string): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmSave',
      message: `Confirm save report as ${filename}?`,
      default: true
    }
  ]);

  return Boolean(answer.confirmSave);
}

export function detectPackageManager(projectPath: string = '.'): PackageManager {
  const lockFiles: { [key in PackageManager]: string } = {
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    pnpm: 'pnpm-lock.yaml',
    bun: 'bun.lockb'
  };

  for (const [manager, lockFile] of Object.entries(lockFiles)) {
    const lockFilePath = path.join(projectPath, lockFile);
    if (fs.existsSync(lockFilePath)) {
      return manager as PackageManager;
    }
  }

  return 'npm';
}

export function parseNpmLockfile(lockFilePath: string): DependenciesMap {
  const packageLock: { packages?: Record<string, any> } = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
  const allPackages: DependenciesMap = {};

  if (packageLock.packages && Object.keys(packageLock.packages).length > 0) {
    for (const [packagePath, packageInfo] of Object.entries(packageLock.packages || {})) {
      if (packagePath === '') continue;

      const packageName = packagePath.replace('node_modules/', '');
      const normalizedName = packageName.includes('/') && !packageName.startsWith('@')
        ? packageName.split('/').pop()
        : packageName;

      if (packageInfo.version && normalizedName) {
        allPackages[normalizedName] = packageInfo.version;
      }
    }
    return allPackages;
  }

  const traverseDeps = (deps: Record<string, any>) => {
    if (!deps || typeof deps !== 'object') return;
    for (const [name, info] of Object.entries(deps)) {
      if (!info || typeof info !== 'object') continue;
      if (info.version) {
        allPackages[name] = info.version;
      }
      if (info.dependencies) {
        traverseDeps(info.dependencies);
      }
    }
  };

  traverseDeps((packageLock as any).dependencies || {});
  return allPackages;
}

export function parsePnpmLockfile(lockFilePath: string): DependenciesMap {
  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    const allPackages: DependenciesMap = {};

    const packagesMatch = content.match(/packages:\s*\n([\s\S]*?)(?=\n[^\s#]|\s*$)/);
    if (!packagesMatch?.[1]) {
      return allPackages;
    }

    const packagesSection = packagesMatch[1];
    const packageLines = packagesSection.match(/^  \/[^\n]+/gm) || [];

    packageLines.forEach(line => {
      const match = line.match(/\/([^@]+)@([^:]+):/);
      if (match?.[1] && match?.[2]) {
        const packageName = match[1];
        const version = match[2];
        allPackages[packageName] = version;
      }
    });

    return allPackages;
  } catch (error) {
    console.warn(`Warning: Could not parse pnpm-lock.yaml: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

export function parseYarnLockfile(lockFilePath: string): DependenciesMap {
  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    const allPackages: DependenciesMap = {};

    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i]?.trim();
      if (!line) {
        i++;
        continue;
      }

      if (line.startsWith('"') && line.includes('@')) {
        const match = line.match(/"([^"@]+)@([^\"]+)":/);
        if (match?.[1] && match?.[2]) {
          const packageName = match[1];
          let resolvedVersion = match[2];
          let j = i + 1;

          while (j < lines.length) {
            const nextLine = lines[j]?.trim();
            if (!nextLine || nextLine.startsWith('"')) {
              break;
            }
            const versionMatch = nextLine.match(/version\s+"([^\"]+)"/);
            if (versionMatch?.[1]) {
              resolvedVersion = versionMatch[1];
              break;
            }
            j++;
          }

          allPackages[packageName] = resolvedVersion;
        }
      }
      i++;
    }

    return allPackages;
  } catch (error) {
    console.warn(`Warning: Could not parse yarn.lock: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

export function parseBunLockfile(_lockFilePath: string): DependenciesMap {
  console.warn('Warning: bun.lockb parsing requires additional dependencies. Falling back to package.json only.');
  return {};
}

export function parseCliArgs(argv: string[]): { command: string; flags: Record<string, string | boolean> } {
  const args = [...argv];
  const flags: Record<string, string | boolean> = {};
  let command = 'scan';

  const firstArg = args[0];
  if (firstArg !== undefined && !firstArg.startsWith('-')) {
    command = args.shift() as string;
  }

  while (args.length > 0) {
    const token = args.shift() as string;
    if (token === '--direct-only') {
      flags['direct-only'] = true;
    } else if (token === '--full') {
      flags['full'] = true;
    } else if (token === '--clear-cache' || token === '--invalidate-cache') {
      flags['clear-cache'] = true;
    } else if (token === '--cache-file') {
      const next = args[0];
      if (next !== undefined && !next.startsWith('-')) {
        flags['cache-file'] = args.shift() as string;
      }
    } else if (token.startsWith('--cache-file=')) {
      flags['cache-file'] = token.slice('--cache-file='.length);
    } else if (token === '--save') {
      const next = args[0];
      if (next !== undefined && !next.startsWith('-')) {
        flags.save = args.shift() as string;
      } else {
        flags.save = 'security-scan.json';
      }
    } else if (token.startsWith('--save=')) {
      flags.save = token.slice('--save='.length);
    } else if (token === '--help' || token === '-h') {
      flags.help = true;
    }
  }

  return { command, flags };
}

export function showHelp(): void {
  console.log('Usage: npm-check <command> [options]\n');
  console.log('Commands:');
  console.log('  scan [--direct-only|--full] [--clear-cache] [--cache-file <path>]');
  console.log('                                   Scan dependencies');
  console.log('  all-installed                    List all installed packages');
  console.log('  generate-report [--save [file]] [--clear-cache] [--cache-file <path>]');
  console.log('                                   Scan and generate a report, optionally saving it');
  console.log('  help                             Show help');
  console.log('\nOptions:');
  console.log('  --clear-cache, --invalidate-cache   Clear previous cached scan results');
  console.log('  --cache-file <path>                 Use a custom cache file instead of .npm-check-cache.json');
  console.log('\nExamples:');
  console.log('  npm-check scan --direct-only');
  console.log('  npm-check scan --full --clear-cache');
  console.log('  npm-check all-installed');
  console.log('  npm-check generate-report --save security-scan.json');
  console.log('  npm-check scan --cache-file .cache/npm-check.json');
}
