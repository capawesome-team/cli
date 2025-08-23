import { describe, it, expect, vi, beforeEach } from 'vitest';
import command from './setup.js';

// Mock dependencies
vi.mock('fs');
vi.mock('std-env');
vi.mock('child_process');
vi.mock('@/services/apps.js');
vi.mock('@/services/authorization-service.js');
vi.mock('@/services/organizations.js');
vi.mock('@/utils/prompt.js');

describe('apps:setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(command).toBeDefined();
    expect(command.description).toBe('Set up the Live Update plugin for a Capacitor app.');
  });

  it('should have correct options schema', () => {
    expect(command.options).toBeDefined();
  });
});
