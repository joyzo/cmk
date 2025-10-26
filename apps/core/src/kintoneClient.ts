import { KintoneRequestError } from "./errors";
import {
  FetchImplementation,
  KintoneBulkRequestResponse,
  KintoneBulkRequestSubRequest,
  KintoneClientOptions,
  KintoneField,
  KintoneListRecordsParams,
  KintoneListRecordsResponse,
  KintoneRecord
} from "./types";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json"
} as const;

function ensureFetchImplementation(fetchImpl: FetchImplementation | undefined): FetchImplementation {
  if (fetchImpl) {
    return fetchImpl;
  }

  if (typeof globalThis.fetch !== "function") {
    throw new Error(
      "Fetch API is not available in this environment. Provide `fetchImplementation` when initialising KintoneClient."
    );
  }

  return globalThis.fetch.bind(globalThis);
}

export class KintoneClient {
  private readonly baseUrl: string;
  private readonly apps: KintoneClientOptions["apps"];
  private readonly fetchImpl: FetchImplementation;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: KintoneClientOptions) {
    if (!options.baseUrl) {
      throw new Error("`baseUrl` is required to initialise KintoneClient");
    }

    if (!options.apps || Object.keys(options.apps).length === 0) {
      throw new Error("At least one app configuration is required");
    }

    this.baseUrl = options.baseUrl.replace(/\/?$/, "");
    this.apps = options.apps;
    this.fetchImpl = ensureFetchImplementation(options.fetchImplementation);
    this.defaultHeaders = { ...DEFAULT_HEADERS, ...(options.defaultHeaders ?? {}) };
  }

  /** 指定した appKey に紐づくアプリ設定を取得する */
  private resolveApp(appKey: string) {
    const app = this.apps[appKey];
    if (!app) {
      throw new Error(`Unknown app key: ${appKey}`);
    }

    return app;
  }

  private buildHeaders(appKey: string): Record<string, string> {
    const { apiToken } = this.resolveApp(appKey);
    return {
      ...this.defaultHeaders,
      "X-Cybozu-API-Token": apiToken
    };
  }

  private async executePost<T>(api: string, headers: Record<string, string>, payload: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/k/v1/${api}`;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        // noop - body might not be JSON
      }
      const message = errorBody?.message ?? `Request failed with status ${response.status}`;
      const code = errorBody?.code;
      const details = errorBody?.errors ?? errorBody?.details;
      throw new KintoneRequestError(message, response.status, code, details);
    }

    return (await response.json()) as T;
  }

  private post<T>(api: string, appKey: string, payload: Record<string, unknown>): Promise<T> {
    return this.executePost<T>(api, this.buildHeaders(appKey), payload);
  }

  /**
   * レコード一覧を取得する。返却されるレコードは kintone REST API の生データ。
   */
  async listRecords<T extends KintoneRecord = KintoneRecord>(
    appKey: string,
    params: KintoneListRecordsParams = {}
  ): Promise<KintoneListRecordsResponse<T>> {
    const { appId } = this.resolveApp(appKey);
    const payload: Record<string, unknown> = {
      app: appId
    };

    if (params.fields) {
      payload.fields = params.fields;
    }
    if (params.query) {
      payload.query = params.query;
    }
    if (typeof params.limit === "number") {
      payload.limit = params.limit;
    }
    if (typeof params.offset === "number") {
      payload.offset = params.offset;
    }
    if (params.totalCount) {
      payload.totalCount = "true";
    }

    return this.post<KintoneListRecordsResponse<T>>("records.json", appKey, payload);
  }

  /**
   * スラッグをキーに単一レコードを取得するヘルパー。該当レコードが存在しない場合は `null` を返す。
   */
  async getRecordBySlug<T extends KintoneRecord = KintoneRecord>(appKey: string, slug: string): Promise<T | null> {
    const query = `slug = "${slug}"`;
    const { records } = await this.listRecords<T>(appKey, { query, limit: 1 });
    return records[0] ?? null;
  }

  /**
   * レコード ID を指定して単一レコードを取得する。
   */
  async getRecordById<T extends KintoneRecord = KintoneRecord>(appKey: string, recordId: string): Promise<T | null> {
    const { appId } = this.resolveApp(appKey);
    const payload = { app: appId, id: recordId };
    const response = await this.post<{ record: T }>("record.json", appKey, payload);
    return response.record ?? null;
  }

  /**
   * Bulk Request を利用し、複数のリクエストをまとめて送信する。
   */
  async bulkRequest(subRequests: KintoneBulkRequestSubRequest[]): Promise<KintoneBulkRequestResponse> {
    if (subRequests.length === 0) {
      return { results: [] };
    }

    const tokens = new Set<string>();
    const requests = subRequests.map(subRequest => {
      const { appKey, payload, ...rest } = subRequest;
      const { appId, apiToken } = this.resolveApp(appKey);
      tokens.add(apiToken);
      const finalPayload: Record<string, unknown> = {
        ...payload
      };
      if (typeof finalPayload.app === "undefined") {
        finalPayload.app = appId;
      }
      return {
        ...rest,
        payload: finalPayload
      };
    });

    const headers = {
      ...this.defaultHeaders,
      "X-Cybozu-API-Token": Array.from(tokens).join(",")
    };

    return this.executePost<KintoneBulkRequestResponse>("bulkRequest.json", headers, {
      requests
    });
  }

  /**
   * kintone の値からプリミティブを取り出すユーティリティ。
   * 存在しないフィールドを指定した場合は `undefined` を返す。
   */
  static unwrapField<T = unknown>(record: KintoneRecord, fieldName: string): T | undefined {
    const field = record[fieldName] as KintoneField<T> | undefined;
    return field?.value;
  }
}
