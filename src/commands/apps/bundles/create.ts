import { defineCommand } from "citty";
import consola from "consola";
import { prompt } from "../../../utils/prompt";
import { AxiosError } from "axios";
import zip from "../../../utils/zip";
import FormData from "form-data";
import { createReadStream } from "node:fs";
import appsService from "../../../service/apps-service";
import authorizationService from "../../../service/authorization-service";

export default defineCommand({
  meta: {
    description: "Create a new app bundle.",
  },
  args: {
    path: {
      type: "string",
      description: "Path to the bundle to upload. Must be a folder or zip file",
    },
    appId: {
      type: "string",
      description: "App ID to deploy to.",
    },
    channel: {
      type: "string",
      description: "Channel to associate the bundle with.",
    },
  },
  run: async (ctx) => {
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error("You must be logged in to run this command.");
      return;
    }

    let path = ctx.args.path;
    let appId = ctx.args.appId;
    let channelName = ctx.args.channel;
    if (!path) {
      path = await prompt("Enter the path to the app bundle:", {
        type: "text",
      });
    }
    if (!appId) {
      const apps = await appsService.getAll();
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt("Which app do you want to deploy to:", {
        type: "select",
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!channelName) {
        const promptChannel = await prompt(
          "Do you want to deploy to a specific channel?",
          {
            type: "select",
            options: ["Yes", "No"],
          },
        );
        if (promptChannel === "Yes") {
          channelName = await prompt("Enter the channel name:", {
            type: "text",
          });
        }
      }
    }

    if (!zip.isZipped(path)) {
      consola.error("Only .zip files are supported"); // TODO
      return;
    }
    consola.start("Uploading...");
    const formData = new FormData();
    formData.append("file", createReadStream(path));
    if (channelName) {
      formData.append("channelName", channelName);
    }
    try {
      await appsService.create({ appId: appId, formData: formData });
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        consola.error("Your token is no longer valid. Please sign in again.");
      } else {
        consola.error("Failed to create bundle.");
      }
      return;
    }
    consola.success("Bundle successfully created.");
  },
});
