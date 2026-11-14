import { AxiosError } from 'axios';
import { ZodError } from 'zod';

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

export const getCodeFromUnknownError = (error: unknown): string | undefined => {
  if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return undefined;
};

export const getPathFromUnknownError = (error: unknown): string | undefined => {
  if (error instanceof Error && 'path' in error && typeof error.path === 'string') {
    return error.path;
  }
  return undefined;
};

export const getMessageFromUnknownError = (error: unknown): string => {
  let message = 'An unknown error has occurred.';
  if (error instanceof AxiosError) {
    message = getErrorMessageFromAxiosError(error);
  } else if (error instanceof ZodError) {
    message = getErrorMessageFromZodError(error);
  } else if (error instanceof Error) {
    message = error.message;
  }
  return message;
};

const getErrorMessageFromAxiosError = (error: AxiosError): string => {
  let message: string = 'An unknown network error has occurred.';
  const data: any = decodeResponseData(error.response?.data);
  if (
    !error.response &&
    (error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENETUNREACH' ||
      error.message.includes('Network Error'))
  ) {
    message = 'No connection could be established. Please check your internet connection and try again.';
  } else if (error.response?.status === 401) {
    message = 'Your token is no longer valid. Please sign in again.';
  } else if (error.response?.status === 500) {
    message = 'An internal server error has occurred. Please try again later.';
  } else if (error.response?.status === 503) {
    message = 'The service is currently unavailable. Please try again later.';
  } else if (data?.message) {
    message = data.message;
  } else if (Array.isArray(data?.error) && data.error[0]?.message) {
    message = data.error[0].message;
  } else if (data?.error?.issues?.[0]?.message) {
    message = data.error.issues[0].message;
  } else if (data && typeof data === 'string') {
    message = data;
  }
  return message;
};

// A request that asks for bytes, such as the one of the `api` command, gets its error body as bytes too.
const decodeResponseData = (data: unknown): unknown => {
  if (!Buffer.isBuffer(data) && !(data instanceof ArrayBuffer)) {
    return data;
  }
  const text = new TextDecoder().decode(data);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getErrorMessageFromZodError = (error: ZodError): string => {
  let message: string = 'An unknown validation error has occurred. Please check your input.';
  const firstIssue = error.issues[0];
  if (firstIssue) {
    message = firstIssue.message;
  }
  return message;
};
