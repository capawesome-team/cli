import { z } from 'zod';
import type { OptionsDefinition, CommandDefinition, DefineConfig } from './types.js';

export function defineOptions<T extends z.ZodObject<any> = z.ZodObject<any>>(
  schema: T,
  aliases?: Record<string, string>,
): OptionsDefinition<T> {
  return { schema, aliases };
}

export function defineCommand<
  TOptions extends z.ZodObject<any> = z.ZodObject<any>,
  TArgs extends z.ZodType | undefined = undefined,
>(config: CommandDefinition<TOptions, TArgs>): CommandDefinition<TOptions, TArgs> {
  return config;
}

export function defineConfig<
  TGlobalOptions extends z.ZodObject<any> = z.ZodObject<any>,
  TCommands extends Record<string, CommandDefinition<any, any>> = {},
>(config: DefineConfig<TGlobalOptions, TCommands>): DefineConfig<TGlobalOptions, TCommands> {
  return config;
}