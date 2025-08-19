import { fileExistsAtPath } from '@/utils/file.js';
import { generateManifestJson } from '@/utils/manifest.js';
import { prompt } from '@/utils/prompt.js';
import consola from 'consola';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import generateManifestCommand from './generate.js';

// Mock dependencies
vi.mock('@/utils/file.js');
vi.mock('@/utils/manifest.js');
vi.mock('@/utils/prompt.js');
vi.mock('consola');

describe('manifests-generate', () => {
  const mockFileExistsAtPath = vi.mocked(fileExistsAtPath);
  const mockGenerateManifestJson = vi.mocked(generateManifestJson);
  const mockPrompt = vi.mocked(prompt);
  const mockConsola = vi.mocked(consola);

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate manifest with provided path', async () => {
    const options = { path: './dist' };

    mockFileExistsAtPath.mockResolvedValue(true);
    mockGenerateManifestJson.mockResolvedValue(undefined);

    await generateManifestCommand.action(options, undefined);

    expect(mockFileExistsAtPath).toHaveBeenCalledWith('./dist');
    expect(mockGenerateManifestJson).toHaveBeenCalledWith('./dist');
    expect(mockConsola.success).toHaveBeenCalledWith('Manifest file generated.');
  });

  it('should prompt for path when not provided', async () => {
    const options = {};

    mockPrompt.mockResolvedValueOnce('./www');
    mockFileExistsAtPath.mockResolvedValue(true);
    mockGenerateManifestJson.mockResolvedValue(undefined);

    await generateManifestCommand.action(options, undefined);

    expect(mockPrompt).toHaveBeenCalledWith('Enter the path to the web assets folder:', {
      type: 'text',
    });
    expect(mockFileExistsAtPath).toHaveBeenCalledWith('./www');
    expect(mockGenerateManifestJson).toHaveBeenCalledWith('./www');
    expect(mockConsola.success).toHaveBeenCalledWith('Manifest file generated.');
  });

  it('should handle missing path in prompt', async () => {
    const options = {};

    mockPrompt.mockResolvedValueOnce('');

    await generateManifestCommand.action(options, undefined);

    expect(mockConsola.error).toHaveBeenCalledWith('You must provide a path to the web assets folder.');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle nonexistent path', async () => {
    const options = { path: './nonexistent' };

    mockFileExistsAtPath.mockResolvedValue(false);

    await generateManifestCommand.action(options, undefined);

    expect(mockConsola.error).toHaveBeenCalledWith('The path does not exist.');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
