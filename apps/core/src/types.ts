export type FetchImplementation = typeof fetch;

export interface KintoneAppConfig {
  /** kintone アプリ ID */
  appId: number;
  /** アプリに対応した API トークン */
  apiToken: string;
}

export interface KintoneClientAppMap {
  [appKey: string]: KintoneAppConfig;
}

export interface KintoneClientOptions {
  /** kintone のベース URL (例: https://example.cybozu.com) */
  baseUrl: string;
  /** アプリごとの設定。appKey は `articles` や `pages` など任意の文字列 */
  apps: KintoneClientAppMap;
  /**
   * デフォルトのフェッチ関数。テスト時に差し替えることで、HTTP 通信をモックできる。
   * 指定がなければ `globalThis.fetch` が利用される。
   */
  fetchImplementation?: FetchImplementation;
  /**
   * 共通で付与する HTTP ヘッダー。個別の API トークンは自動で付与されるため、
   * 認証以外のメタ情報ヘッダーを付けたい場合に利用する。
   */
  defaultHeaders?: Record<string, string>;
}

export interface KintoneListRecordsParams {
  fields?: string[];
  query?: string;
  totalCount?: boolean;
  /** 1 リクエストあたりの取得件数 (1-500) */
  limit?: number;
  /** 取得開始位置 */
  offset?: number;
}

export interface KintoneField<T = unknown> {
  type: string;
  value: T;
}

export type KintoneRecord<T extends Record<string, KintoneField> = Record<string, KintoneField>> = T & {
  $id?: KintoneField<string>;
  $revision?: KintoneField<string>;
};

export interface KintoneListRecordsResponse<T extends KintoneRecord = KintoneRecord> {
  records: T[];
  totalCount?: string;
}

export interface KintoneBulkRequestSubRequest {
  /** `apps` マップで定義したキー */
  appKey: string;
  method: string;
  api: string;
  payload: Record<string, unknown>;
}

export interface KintoneBulkRequestResponse {
  results: Array<{
    id?: string;
    revision?: string;
    records?: KintoneRecord[];
  }>;
}
