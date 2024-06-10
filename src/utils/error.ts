import { AxiosError } from 'axios';

export const getMessageFromUnknownError = (error: unknown): string => {
  let message = 'An unknown error has occurred.';
  if (error instanceof AxiosError) {
    message = getErrorMessageFromAxiosError(error);
  } else if (error instanceof Error) {
    message = error.message;
  }
  return message;
};

const getErrorMessageFromAxiosError = (error: AxiosError): string => {
  let message: string = 'An unknown network error has occurred.';
  if (error.response?.status === 401) {
    message = 'Your token is no longer valid. Please sign in again.';
  } else if ((error.response?.data as any)?.message) {
    message = (error.response?.data as any)?.message;
  } else if ((error.response?.data as any)?.error?.issues[0]?.message) {
    message = (error.response?.data as any).error.issues[0].message;
  }
  return message;
};
