# CMK

kintone をヘッドレス CMS として活用し、Web サイトに埋め込み可能なフロントエンドライブラリ群を開発するプロジェクトです。

## パッケージ構成 (プロトタイプ)

| パッケージ | 役割 | 概要 |
|------------|------|------|
| `@cmk/core` | データアクセス層 | kintone REST API 向けのクライアントとユーティリティを提供します。Bulk Request 対応やスラッグ検索のヘルパーを備えています。 |
| `@cmk/embed` | 埋め込みエントリー | `<cmk-embed>` カスタムエレメントを登録し、`@cmk/core` と連携してコンテンツを描画します。遅延ハイドレーションにも対応しています。 |

> 📦 モノレポは [pnpm workspace](https://pnpm.io/workspaces) で管理しています。`pnpm install` を実行すると全パッケージの依存関係が解決されます。

## 開発スクリプト

```bash
pnpm install            # 依存関係のインストール
pnpm build              # 各パッケージのビルド (tsup)
pnpm lint               # TypeScript 型チェック
```

## プロトタイプの動かし方

`apps/embed-demo` パッケージでは `<cmk-embed>` の動作確認ができる Vite ベースのデモ環境を提供しています。

1. 依存関係をインストール: `pnpm install`
2. コアライブラリをビルド: `pnpm build`
3. `apps/embed-demo/.env.example` をコピーし、kintone の接続情報を `.env.local` に設定（未設定の場合はモックデータで起動）
4. デモサーバーを起動: `pnpm dev --filter @cmk/embed-demo`

モックモードではダミーのレコードが表示され、実機モードでは指定したアプリから `slug` フィールドに一致するレコードを取得します。

## ドキュメント
- [アーキテクチャ設計](docs/architecture.md)
  - TypeScript 埋め込みモジュールと kintone プラグイン構成を含む
- [Embed デモ環境の使い方](docs/embed-demo.md)

## ライセンス
[MIT](LICENSE)
