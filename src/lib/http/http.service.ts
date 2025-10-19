import { Injectable } from '@nestjs/common';
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

export interface RequestPayloadOptions<T = unknown> {
  endpointUrl: string;
  dataPayload?: T;
  requestConfig?: AxiosRequestConfig;
}

export interface ApiResponse<T = unknown> {
  statusCode: number;
  apiResponse: T;
}

@Injectable()
export class HttpService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({});
  }

  public async get<ResponseType = unknown>(
    getRequestPayloadOptions: RequestPayloadOptions,
  ): Promise<ApiResponse<ResponseType>> {
    const { endpointUrl, requestConfig } = getRequestPayloadOptions;
    const response: AxiosResponse<ResponseType> =
      await this.client.get<ResponseType>(endpointUrl, requestConfig);
    return { statusCode: response.status, apiResponse: response.data };
  }

  public async post<RequestType = unknown, ResponseType = unknown>(
    postRequestPayloadOptions: RequestPayloadOptions<RequestType>,
  ): Promise<ApiResponse<ResponseType>> {
    const { endpointUrl, dataPayload, requestConfig } =
      postRequestPayloadOptions;
    const response: AxiosResponse<ResponseType> =
      await this.client.post<ResponseType>(
        endpointUrl,
        dataPayload,
        requestConfig,
      );
    return { statusCode: response.status, apiResponse: response.data };
  }

  public async put<RequestType = unknown, ResponseType = unknown>(
    putRequestPayloadOptions: RequestPayloadOptions<RequestType>,
  ): Promise<ApiResponse<ResponseType>> {
    const { endpointUrl, dataPayload, requestConfig } =
      putRequestPayloadOptions;
    const response: AxiosResponse<ResponseType> =
      await this.client.put<ResponseType>(
        endpointUrl,
        dataPayload,
        requestConfig,
      );
    return { statusCode: response.status, apiResponse: response.data };
  }

  public async patch<RequestType = unknown, ResponseType = unknown>(
    patchRequestPayloadOptions: RequestPayloadOptions<RequestType>,
  ): Promise<ApiResponse<ResponseType>> {
    const { endpointUrl, dataPayload, requestConfig } =
      patchRequestPayloadOptions;

    const response: AxiosResponse<ResponseType> =
      await this.client.patch<ResponseType>(
        endpointUrl,
        dataPayload,
        requestConfig,
      );
    return { statusCode: response.status, apiResponse: response.data };
  }
}
