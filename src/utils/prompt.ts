import consola from "consola";
import { password as clackPassword } from "@clack/prompts";

/**
 * This is a workaround for the issue with consola.prompt not detecting command cancellation.
 *
 * @see https://github.com/unjs/consola/issues/251#issuecomment-1810269084
 */
export const prompt: typeof consola.prompt = async (message, options) => {
  const response = await consola.prompt(message, options);
  if (response && response.toString() === "Symbol(clack:cancel)") {
    process.exit(0);
  }
  return response;
};

/**
 * This is a workaround to support password prompts.
 * 
 * @see https://github.com/unjs/consola/issues/285
 */
export const passwordPrompt = async (message: string) => {
  const result = await clackPassword({ message });
  if (typeof result === "symbol") {
    process.exit(0);
  }
  return result;
};
