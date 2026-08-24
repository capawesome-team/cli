import fs from 'fs';
import os from 'os';
import pathModule from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MANIFEST_JSON_FILE_NAME } from '@/config/index.js';
import { generateManifestJson } from './manifest.js';

describe('generateManifestJson', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(pathModule.join(os.tmpdir(), 'manifest-'));
    fs.mkdirSync(pathModule.join(directory, 'assets'));
    fs.writeFileSync(pathModule.join(directory, 'index.html'), '<html></html>');
    fs.writeFileSync(pathModule.join(directory, 'assets', 'main.js'), 'console.log(1);');
  });

  afterEach(() => {
    fs.rmSync(directory, { force: true, recursive: true });
  });

  it('should write the manifest file before resolving', async () => {
    await generateManifestJson(directory);

    expect(fs.existsSync(pathModule.join(directory, MANIFEST_JSON_FILE_NAME))).toBe(true);
  });

  it('should list all files except the manifest file itself', async () => {
    await generateManifestJson(directory);

    const manifestItems = JSON.parse(fs.readFileSync(pathModule.join(directory, MANIFEST_JSON_FILE_NAME), 'utf8'));
    expect(manifestItems.map((item: { href: string }) => item.href).sort()).toEqual(['assets/main.js', 'index.html']);
  });
});
