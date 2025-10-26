# CMK kintone CMS Embeddable Library 設計ドキュメント

## 1. ゴール
Codex が開発を進めるにあたり、kintone をヘッドレス CMS として活用し、
Web サイトへ埋め込み可能な JavaScript ライブラリを構築する。記事、固定ページ、
画像のデータを統合的に扱い、API リクエスト数を最適化しつつ拡張・再利用性の高い
アーキテクチャを提供する。

## 2. 全体アーキテクチャ概要
- モノレポ構成（pnpm workspace）で各パッケージを管理。
- バンドラは `tsup` + `esbuild` を想定し、ESM と IIFE をビルドターゲットに含める。
- `apps/server` は SSR や静的生成時のデータプリフェッチ用の BFF（Backend For Frontend）。
- kintone 側の接続設定は専用プラグイン（`apps/kintone-plugin`）で管理する。

```
apps/
  core/            # データアクセス・キャッシュ層 (TypeScript)
  adapters/        # kintone アプリ設定・マッピング (TypeScript)
  renderers/       # テンプレートエンジン & マーキング (TypeScript)
  widgets/         # UI ウィジェット（Web Components / React / Vue）(TypeScript)
  embed/           # サイト埋め込み用エントリーとローダー (TypeScript)
  cli/             # ビルド・同期用 CLI (TypeScript)
  server/          # API プロキシ & SSR 補助 (TypeScript/Node)
  kintone-plugin/  # 接続設定とデプロイトリガー管理用 kintone プラグイン
```

## 3. データモデル
### 3.1 kintone アプリ
| 種別 | 推奨アプリ名 | 主キー | 主フィールド | 関連フィールド |
|------|---------------|--------|---------------|----------------|
| 記事 | Articles      | recordId, slug | title, body, status, publishAt | heroImage (media), categories |
| 固定 | Pages         | recordId, slug | title, body, templateKey | heroImage (media) |
| 画像 | Media         | recordId, fileKey | altText, width, height | linkedRecords (多値) |

- `linkedRecords` には記事/固定ページの `recordId` を格納。クライアント側で逆引きのために使用。
- 各レコードには `revision` を保持し、差分検出に利用。

### 3.2 Graph 表現
- core 層では取得データを正規化し、`entities.{articles|pages|media}` と `relationships` を保持。
- フロントからは GraphQL ライクな `select` 構文を提供し、必要なフィールドのみ取得。

## 4. データ取得設計
### 4.1 API アダプタ
- `@cmk/core` の `KintoneClient` が kintone REST API をラップ。
- Bulk Request (最大 20 件) を利用し、記事 + 画像 + 固定ページをまとめて取得。
- 大量取得時は `cursor` API を活用し、ページングを抽象化。

### 4.2 キャッシュ戦略
1. **ビルド時プリフェッチ**
   - CLI コマンド `cmk sync` で全レコードをダンプし、`dist/data/manifest.json` を生成。
   - S3 などに配置し、CDN 経由で配布。フロントは初回ロード時に manifest を参照。
2. **ランタイムキャッシュ**
   - ブラウザでは Service Worker + IndexedDB を採用。
   - `revision` と `ETag` を突き合わせて差分更新。
   - 画像は CloudFront でレスポンシブ派生を用意し、`Cache-Control` を適切に設定。
3. **API リクエスト抑制**
   - `QueryManager` がクエリ文字列をハッシュ化し、同一クエリはメモ化。
   - Backoff ポリシー（指数的リトライ）とレートリミット（トークンバケット）を内蔵。
   - ウィジェット間で結果を共有するため、`BroadcastChannel` を用いた同期も検討。

### 4.3 Webhook & 再取得
- kintone Webhook → API Gateway → Lambda → `cmk sync` のトリガー。
- CloudFront の invalidation や manifest の再生成を自動化。

## 5. レンダリング層
### 5.1 Web Components
- `<cmk-embed data-app="articles" data-slug="foo">` 形式のカスタム要素を提供。
- Shadow DOM 内でローディング表示、エラー表示を管理。
- slots / テンプレートオプションで柔軟なカスタマイズを許可。

### 5.2 React / Vue アダプタ
- `useKintoneRecord(slug, opts)` フックでデータを取得。
- Suspense 対応とし、SSR 環境でも `preloadQuery` が利用できる API を用意。

### 5.3 Markdown & Rich Text サポート
- kintone で管理する本文は HTML / Markdown いずれにも対応できるよう、`@cmk/renderers` に共通変換レイヤーを実装。
- 画像埋め込みは `mediaResolver` を通じてレスポンシブソースセットを生成。

### 5.4 TypeScript 埋め込みモジュール
- `@cmk/embed` パッケージがエントリーポイントとなり、下記 3 形態で配布する。
  1. `index.esm.js`：モダンバンドラ向け ESM。
  2. `index.iife.js`： `<script>` 1 本差し込み用。
  3. `index.module.js`：`type="module"` スクリプトタグから利用。
- TypeScript で API 呼び出しと DOM 更新の型安全性を担保。DOM API へのアクセサは `HTMLElementTagNameMap` を拡張。
- バンドルには `@lit-labs/ssr` ベースの軽量テンプレートエンジンを採用し、サーバーサイドでも共通コードが動くようにする。
- `createEmbedApp()` API を提供し、ホストページ側では以下のように初期化する想定。
  ```ts
  import { createEmbedApp } from "@cmk/embed";

  createEmbedApp({
    elementSelector: "cmk-embed",
    coreClient: createKintoneClient({ cache: indexedDbCache }),
    hydration: { mode: "lazy" }
  });
  ```
- 複数埋め込みを同一ページで扱う場合は `SharedWorker` を利用し、キャッシュ同期とバックグラウンドフェッチを集中管理。
- ウィジェット層のコンポーネントはツリーシェイカブルに設計し、利用者は必要な要素のみインポートできる。

## 6. セキュリティ・設定
- 環境変数命名例
  - `KINTONE_BASE_URL`
  - `KINTONE_API_TOKEN_ARTICLES`
  - `KINTONE_API_TOKEN_PAGES`
  - `KINTONE_API_TOKEN_MEDIA`
  - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Codex では開発用の値をシークレットに設定済み。実環境では AWS Secrets Manager / SSM Parameter Store を推奨。
- ブラウザにシークレットを渡さないために BFF を介し、JSON Web Token などで短期認証を行う。

## 7. ビルド & デプロイ
- `pnpm` によるワークスペース管理。
- `changesets` でバージョン管理し、パッケージ単位で公開。
- GitHub Actions で以下を自動化
  1. Lint (ESLint) + Type Check (tsc)
  2. Unit Test (Vitest)
  3. `cmk sync` によるデータスナップショット生成
  4. npm / CDN (jsDelivr) への公開

## 8. ロードマップ
1. モノレポ初期セットアップ（pnpm, tsconfig, ESLint）
2. `@cmk/core` の Kintone API クライアント実装
3. キャッシュ層（IndexedDB + Service Worker）
4. Web Components & React/Vue アダプタ
5. CLI ツールとデータ同期
6. デプロイパイプライン整備

## 9. テスト戦略
- Core: モック化した kintone REST API でユニットテスト。
- Widgets: Playwright による E2E テスト。Storybook を利用しビジュアルリグレッションも導入。
- CLI: スナップショットテストで manifest 生成結果を検証。
- パフォーマンス: Lighthouse CI で各ページの LCP/FID を監視。

## 10. 将来的な拡張
- 多言語対応（i18n）: 記事のローカリゼーションフィールドを追加。
- Draft Preview: 署名付き URL で下書きプレビューが可能な仕組み。
- A/B テスト連携: Feature Flag サービスと連動できる Hooks を提供。

## 11. kintone プラグインによる接続設定とデプロイトリガー
- `apps/kintone-plugin` で kintone プラグインを実装し、プラグイン設定画面から以下を入力できるようにする。
  - デプロイ対象環境の識別子（`development` / `staging` / `production`）。
  - API プロキシのエンドポイント URL。
  - デプロイパイプラインを叩く Webhook URL と署名用シークレット。
  - kintone REST API トークン（記事・固定ページ・画像アプリそれぞれ）。
- プラグイン設定は `kintone.plugin.app.setConfig()` を用いて JSON 形式で保存し、`apps/adapters` が読み込んで利用する。
- プラグイン UI は TypeScript + Preact で構築し、`@kintone/plugin-packer` でビルド・署名。
- 記事・固定ページアプリにはプラグインが追加するカスタムボタン（「Deploy Now」など）を配置。
  - ボタン押下時に `fetch` で Webhook を呼び出し、CI/CD パイプライン（例: GitHub Actions）をトリガー。
  - Webhook 呼び出しにはプラグイン設定の署名シークレットで HMAC ヘッダーを付与。
- レコード保存イベントで `revision` 更新や必要なメタデータを自動補完するカスタマイズもプラグインに同梱。
- プラグインバージョン管理は `changesets` と連携し、ビルド成果物 (`plugin.zip`) を GitHub Releases に添付して配布する。
- セキュリティ面では API トークンを暗号化して保存し、プラグインの復号キーを AWS Secrets Manager で管理する BFF 経由で復号する運用を推奨。

---
この設計をベースに実装を進めていきましょう！
