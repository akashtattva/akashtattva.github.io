import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

describe('site build', () => {
  it('should build without errors', () => {
    const result = execSync('npx astro build', {
      encoding: 'utf-8',
      cwd: resolve(__dirname, '../..'),
      timeout: 300000,
    });
    expect(result).toContain('Complete!');
  });

  it('should produce index.html', () => {
    const distIndex = resolve(__dirname, '../../dist/index.html');
    expect(existsSync(distIndex)).toBe(true);
    const html = readFileSync(distIndex, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Akash');
  });
});
