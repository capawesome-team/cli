import { defineCommand } from "citty";
import { isRunningInCi } from "../../utils/ci";
import consola from "consola";
import { prompt } from "../../utils/prompt";
import httpClient from "../../utils/http-client";
import userConfig from "../../utils/userConfig";

export default defineCommand({
  meta: {
    description: "Create a new app.",
  },
  args: {
    name: {
      type: "string",
      description: "Name of the app.",
    },
  },
  run: async (ctx) => {
    if (isRunningInCi()) {
      consola.error("This command is not supported in CI environments.");
      return;
    }
    let name = ctx.args.name;
    if (!name) {
      name = await prompt("Enter the name of the app:", { type: "text" });
    }
    const res = await httpClient.post<{ id: string }>(
      "/apps",
      { name: name },
      { Authorization: `Bearer ${userConfig.read().token}` },
    );
    if (!res.success) {
      consola.error("App could not be created.");
      return;
    }
    consola.success("App created successfully.");
    consola.info(`App ID: ${res.data.id}`);
  },
});
