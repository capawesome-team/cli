import { z } from 'zod';
import type { CommandDefinition, DefineConfig, OptionsDefinition, ProcessResult } from './types.js';

function parseFlags(args: string[]): Record<string, string | boolean | string[]> {
  const flags: Record<string, string | boolean> = {};
  const nonFlags: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.includes('=')) {
        const [flagName, ...valueParts] = key.split('=');
        if (flagName) {
          flags[flagName] = valueParts.join('=');
        }
      } else {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          flags[key] = nextArg;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      const key = arg.slice(1);
      if (key.length === 1) {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          flags[key] = nextArg;
          i++;
        } else {
          flags[key] = true;
        }
      } else {
        for (const char of key) {
          flags[char] = true;
        }
      }
    } else {
      nonFlags.push(arg);
    }
  }

  return { ...flags, _: nonFlags };
}

function resolveAliases(flags: Record<string, any>, aliases?: Record<string, string>): Record<string, any> {
  if (!aliases) return flags;

  const resolved = { ...flags };
  for (const [alias, target] of Object.entries(aliases)) {
    if (alias in resolved) {
      resolved[target] = resolved[alias];
      delete resolved[alias];
    }
  }
  return resolved;
}

function validateOptions<T extends z.ZodObject<any> = z.ZodObject<any>>(
  flags: Record<string, any>,
  optionsDef?: OptionsDefinition<T>,
): any {
  if (!optionsDef) {
    return {};
  }

  const resolved = resolveAliases(flags, optionsDef.aliases);
  const { _, ...options } = resolved;

  try {
    return optionsDef.schema.parse(options);
  } catch (error) {
    throw error;
  }
}

export function processConfig<
  TGlobalOptions extends z.ZodObject<any> = z.ZodObject<any>,
  TCommands extends Record<string, CommandDefinition<any, any>> = {},
>(config: DefineConfig<TGlobalOptions, TCommands>, args: string[]): ProcessResult<TCommands[keyof TCommands]> {
  const parsedFlags = parseFlags(args);
  const commandArgs = (parsedFlags._ as string[]) || [];

  // Find the command
  const commandName = commandArgs[0];
  if (!commandName) {
    // Show available commands
    const commands = Object.keys(config.commands).join(', ');
    throw new Error(`No command specified. Available commands: ${commands}`);
  }

  if (!(commandName in config.commands)) {
    const commands = Object.keys(config.commands).join(', ');
    throw new Error(`Unknown command: ${commandName}. Available commands: ${commands}`);
  }

  const command = config.commands[commandName];
  if (!command) {
    throw new Error(`Command not found: ${commandName}`);
  }

  const remainingArgs = commandArgs.slice(1);

  // Process global options
  const globalOptions = validateOptions(parsedFlags, config.globalOptions);

  // Process command options
  const options = validateOptions(parsedFlags, command.options);

  // Validate args if schema is provided
  let validatedArgs: any = remainingArgs;
  if (command.args) {
    try {
      validatedArgs = command.args.parse(remainingArgs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        throw new Error(`Argument validation failed: ${issues}`);
      }
      throw error;
    }
  }

  return {
    globalOptions,
    command,
    options,
    args: validatedArgs,
  } as ProcessResult<TCommands[keyof TCommands]>;
}
