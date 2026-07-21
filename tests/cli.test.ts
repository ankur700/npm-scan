import { describe, test, expect } from 'bun:test';
import { execa } from 'execa';
import path from 'path';

describe('CLI Integration', () => {
  const binPath = path.resolve(__dirname, '../bin/npm-check.js');

  test('runs help command via CLI entry point', async () => {
    const result = await execa('node', [binPath, 'help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('npm-check');
    expect(result.stdout).toContain('Usage: npm-check <command> [options]');
    expect(result.stdout).toContain('scan');
    expect(result.stdout).toContain('all-installed');
    expect(result.stdout).toContain('generate-report');
  });

  test('handles unknown command with error exit code 1', async () => {
    try {
      await execa('node', [binPath, 'unknown-xyz-command']);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.exitCode).toBe(1);
      expect(error.stderr || error.stdout).toContain('Unknown command: unknown-xyz-command');
    }
  });

  test('runs --help flag via CLI entry point', async () => {
    const result = await execa('node', [binPath, '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: npm-check <command> [options]');
  });
});
