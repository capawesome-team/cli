import { AxiosError, AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { getMessageFromUnknownError } from './error.js';

describe('getMessageFromUnknownError', () => {
  const createAxiosError = (response: Pick<AxiosResponse, 'data' | 'status'>): AxiosError =>
    new AxiosError('Request failed', undefined, undefined, undefined, response as AxiosResponse);

  it('should read the message from a JSON body that comes as a Buffer', () => {
    const error = createAxiosError({ data: Buffer.from('{"message":"App not found."}'), status: 404 });

    expect(getMessageFromUnknownError(error)).toBe('App not found.');
  });

  it('should read a plain text body that comes as an ArrayBuffer as the message', () => {
    const error = createAxiosError({ data: new TextEncoder().encode('Bad request.').buffer, status: 400 });

    expect(getMessageFromUnknownError(error)).toBe('Bad request.');
  });
});
