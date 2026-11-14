import apiService from '@/services/api.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { isReadable } from '@/utils/file.js';
import { prompt } from '@/utils/prompt.js';
import { AxiosResponse } from 'axios';
import consola from 'consola';
import fs from 'fs';
import { text } from 'node:stream/consumers';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodline';

interface BodyOptions {
  bodyPath?: string;
  method?: Method;
}

type Method = (typeof METHODS)[number];

const METHODS = ['DELETE', 'GET', 'PATCH', 'POST', 'PUT'] as const;

const STDIN_BODY_PATH = '-';

export default defineCommand({
  description:
    'Send one request to the Capawesome Cloud API and print the response body. <path> is a path of the API, such as /v1/apps, and may carry a query string. Its leading slash may be left out.',
  examples: [
    "npx @capawesome/cli api '/v1/apps?limit=10'",
    'npx @capawesome/cli api /v1/apps/<app-id>/channels --body-path channel.json',
  ],
  args: z.array(z.string()),
  options: defineOptions(
    z.object({
      bodyPath: z.string().optional().describe('The JSON file to send as the request body, or `-` for stdin.'),
      method: z
        .enum(METHODS)
        .optional()
        .describe(
          'The HTTP method: DELETE, GET, PATCH, POST or PUT. Defaults to GET, or to POST when `--body-path` is passed.',
        ),
    }),
  ),
  action: withAuth(async (options, args) => {
    assertOnePath(args);
    assertBodyAllowed(options);
    const path = args[0] || (await promptPath());
    const body = await readBody(options);
    const response = await apiService.request({
      body,
      method: resolveMethod(options),
      path: resolvePathWithLeadingSlash(path),
    });
    printResponse(response);
  }),
});

function assertBodyAllowed({ bodyPath, method }: BodyOptions): void {
  if (method === 'GET' && bodyPath !== undefined) {
    consola.error('A GET request sends no body, so `--method GET` and `--body-path` cannot be passed together.');
    process.exit(1);
  }
}

function assertOnePath(args: string[]): void {
  const surplusArgs = args.slice(1);
  if (surplusArgs.length > 0) {
    consola.error(`The api command takes one path. It does not take ${surplusArgs.join(' ')}.`);
    process.exit(1);
  }
}

function isJsonResponse(response: AxiosResponse): boolean {
  const contentType = response.headers['content-type'];
  return typeof contentType === 'string' && contentType.toLowerCase().startsWith('application/json');
}

function parseBody(bodyText: string): unknown {
  try {
    return JSON.parse(bodyText);
  } catch {
    consola.error('The body from `--body-path` is not valid JSON.');
    process.exit(1);
  }
}

// An answer that names JSON and holds none, a proxy's error page for example, is no JSON to print.
function parseResponseJson(bytes: Buffer): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

function printResponse(response: AxiosResponse<Buffer>): void {
  const bytes = response.data;
  if (bytes.length === 0) {
    return;
  }
  const json = isJsonResponse(response) ? parseResponseJson(bytes) : undefined;
  if (json === undefined) {
    process.stdout.write(bytes);
    return;
  }
  console.log(JSON.stringify(json, null, 2));
}

async function promptPath(): Promise<string> {
  if (!isInteractive()) {
    consola.error('You must provide a path when running in non-interactive environment.');
    process.exit(1);
  }
  const path = await prompt('Enter the path of the API:', { type: 'text' });
  if (!path) {
    consola.error('You must provide a path.');
    process.exit(1);
  }
  return path;
}

async function readBody({ bodyPath }: BodyOptions): Promise<unknown> {
  if (bodyPath === undefined) {
    return undefined;
  }
  const bodyText = bodyPath === STDIN_BODY_PATH ? await text(process.stdin) : await readBodyFile(bodyPath);
  return parseBody(bodyText);
}

async function readBodyFile(bodyPath: string): Promise<string> {
  if (!(await isReadable(bodyPath))) {
    consola.error(`The body file does not exist or is not accessible: ${bodyPath}`);
    process.exit(1);
  }
  return fs.promises.readFile(bodyPath, 'utf-8');
}

function resolveMethod({ bodyPath, method }: BodyOptions): Method {
  return method ?? (bodyPath === undefined ? 'GET' : 'POST');
}

// Git Bash on Windows turns an argument with a leading slash into a file path, so the path may come without the slash.
function resolvePathWithLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}
