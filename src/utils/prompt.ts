import consola from "consola"

/**
 * This is a workaround for the issue with consola.prompt not detecting command cancellation.
 * 
 * @see https://github.com/unjs/consola/issues/251#issuecomment-1810269084
 */
export const prompt: typeof consola.prompt = async (message, options) => {
	const response = await consola.prompt(message, options)
	if (response.toString() === "Symbol(clack:cancel)") {
		process.exit(0)
	}
	return response
}