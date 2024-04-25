import { defineCommand } from "citty";
import { isRunningInCi } from "../../../utils/ci";
import consola from "consola";
import { prompt } from "../../../utils/prompt";
import appsService from "../../../service/apps";
import { AxiosError } from "axios";
import appChannelsService from "../../../service/app-channel";

export default defineCommand({
  meta: {
    description: "Create a new app channel.",
  },
  args: {
    appId: {
        type: "string",
        description: "ID of the app.",
    },
    name: {
      type: "string",
      description: "Name of the channel.",
    },
  },
  run: async (ctx) => {
    if (isRunningInCi()) {
      consola.error("This command is not supported in CI environments.");
      return;
    }
    let appId = ctx.args.appId;
    if (!appId) {
      const apps = await appsService.findAll();
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt(
        "Which app do you want to delete the channel from?",
        {
          type: "select",
          options: apps.map((app) => ({ label: app.name, value: app.id })),
        },
      );
    }
    let name = ctx.args.name;
    if (!name) {
      name = await prompt("Enter the name of the channel:", { type: "text" });
    }
    try {
      await appChannelsService.create({ 
        appId,
        name
       });
      consola.success("Channel created successfully.");
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        consola.error("Your token is no longer valid. Please sign in again.");
      } else {
        consola.error("Failed to create channel.");
      }
    }
  },
});