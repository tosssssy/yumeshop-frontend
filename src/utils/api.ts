import { Api } from 'src/types/api';
import { isEmptyObj } from './isEmptyObj';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export class ApiResponseError extends Error {
  url: string;

  statusText: string;

  message: string;

  constructor(url: string, statusText: string, message: string) {
    super();
    this.name = 'ApiResponseError';
    this.url = url;
    this.statusText = statusText;
    this.message = message;
  }

  public static init = async (response: Response) => {
    const json = (await response.json()) as { message: string };
    return new ApiResponseError(
      response.url,
      `${response.status} ${response.statusText}`,
      json.message,
    );
  };
}

// 余剰プロパティチェック
export type StrictPropertyCheck<T, TExpected> = Exclude<
  keyof T,
  keyof TExpected
> extends never
  ? T
  : never;

export const fetchApi = async <T>(
  url: string,
  method: HttpMethod,
  params?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<T> => {
  let requestUrl = url;
  let requestParams = { ...params };
  const requestHeaders = headers || {};

  if (method === 'GET') {
    // /example/:id -> /example/1
    requestUrl = url
      .split('/')
      .map((segment) => {
        if (segment[0] === ':' && params) {
          const { [segment.slice(1)]: _embedInUrl, ...rest } = requestParams;
          requestParams = rest;
          return params[segment.slice(1)] as string;
        }
        return segment;
      })
      .join('/');

    // /example/1 -> /example/1?searchWord="あああ"
    if (!isEmptyObj(requestParams)) {
      requestUrl += `?${Object.entries(requestParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')}`;
      requestParams = {};
    }
  }

  if (!isEmptyObj(requestParams)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  let result;
  try {
    const res = await fetch(
      encodeURI(`${process.env.NEXT_PUBLIC_API_BASE_URL}${requestUrl}`),
      {
        method,
        body: isEmptyObj(requestParams) ? null : JSON.stringify(requestParams),
        headers: { ...requestHeaders },
      },
    );

    if (!res.ok) {
      throw await ApiResponseError.init(res);
    }
    result = await res.json();
  } catch (error) {
    if (error instanceof ApiResponseError) {
      throw error;
    }
  }

  return result as T;
};

export const getApi = async <
  Url extends keyof Api['GET'],
  Request extends Api['GET'][Url][0],
  Response extends Api['GET'][Url][1],
>(
  url: Url,
  ...args: Request extends undefined
    ? []
    : [StrictPropertyCheck<Request, Api['GET'][Url][0]>]
) => fetchApi<Response>(url, 'GET', args.at(0));

export const postApi = async <
  Url extends keyof Api['POST'],
  Request extends Api['POST'][Url][0],
  Response extends Api['POST'][Url][1],
>(
  url: Url,
  ...args: Request extends undefined
    ? []
    : [StrictPropertyCheck<Request, Api['POST'][Url][0]>]
) => fetchApi<Response>(url, 'POST', args.at(0));

export const putApi = async <
  Url extends keyof Api['PUT'],
  Request extends Api['PUT'][Url][0],
  Response extends Api['PUT'][Url][1],
>(
  url: Url,
  ...args: Request extends undefined
    ? []
    : [StrictPropertyCheck<Request, Api['PUT'][Url][0]>]
) => fetchApi<Response>(url, 'PUT', args.at(0));

export const deleteApi = async <
  Url extends keyof Api['DELETE'],
  Request extends Api['DELETE'][Url][0],
>(
  url: Url,
  ...args: Request extends undefined
    ? []
    : [StrictPropertyCheck<Request, Api['DELETE'][Url][0]>]
) => fetchApi<undefined>(url, 'DELETE', args.at(0));
