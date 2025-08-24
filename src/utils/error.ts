import { AxiosError } from 'axios';
import { ZodError } from 'zod';

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
  if (error.response?.status === 401) {
    message = 'Your token is no longer valid. Please sign in again.';
  } else if (error.response?.status === 403) {
    message = 'You do not have permission to access this resource.';
  } else if (error.response?.status === 500) {
    message = 'An internal server error has occurred. Please try again later.';
  } else if (error.response?.status === 503) {
    message = 'The service is currently unavailable. Please try again later.';
  } else if ((error.response?.data as any)?.message) {
    message = (error.response?.data as any)?.message;
  } else if ((error.response?.data as any)?.error?.issues[0]?.message) {
    message = (error.response?.data as any).error.issues[0].message;
  } else if (error.response?.data && typeof error.response?.data === 'string') {
    message = error.response.data;
  }
  return message;
};

const getErrorMessageFromZodError = (error: ZodError): string => {
  let message: string = 'An unknown validation error has occurred. Please check your input.';
  const firstIssue = error.issues[0];
  if (firstIssue) {
    message = firstIssue.message;
  }
  return message;
};
