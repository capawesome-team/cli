import { defineCommand } from "citty";
import consola from "consola";
import { AxiosError } from "axios";
import { isRunningInCi } from "../../../utils/ci";
import appsService from "../../../service/apps";
import { prompt } from "../../../utils/prompt";
import appBundlesService from "../../../service/app-bundle";

export default defineCommand({
  meta: {
    description: "Delete an app bundle.",
  },
  args: {
    appId: {
      type: "string",
      description: "ID of the app.",
    },
    bundleId: {
      type: "string",
      description: "ID of the bundle.",
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
      appId = await prompt("Which app do you want to delete the bundle from?", {
        type: "select",
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    let bundleId = ctx.args.bundleId;
    if (!bundleId) {
        bundleId = await prompt("Enter the bundle ID:", {
          type: "text",
        });
    }
    const confirmed = await prompt(
      "Are you sure you want to delete this bundle?",
      {
        type: "confirm",
      },
    );
    if (!confirmed) {
      return;
    }
    try {
      await appBundlesService.delete({ 
        appId,
        bundleId
       });
      consola.success("Bundle deleted successfully.");
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        consola.error("Your token is no longer valid. Please sign in again.");
      } else {
        consola.error("Failed to delete bundle.");
      }
    }
  },
});