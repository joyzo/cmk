# Embed デモ環境の使い方

`@cmk/embed` のカスタムエレメントをブラウザで動作確認するためのサンプルアプリです。Vite を利用しており、kintone の実データを取得するモードと、モックデータを返すモードの 2 通りで動作します。

## 前提

- Node.js 18 以降
- pnpm 8 以降

## セットアップ

```bash
pnpm install
pnpm build
```

`pnpm build` により `@cmk/core` と `@cmk/embed` がビルドされ、デモから参照できるようになります。

## モックモードでの起動

環境変数を設定しない場合、モックデータが返るフェッチ実装が自動的に利用されます。

```bash
pnpm dev --filter @cmk/embed-demo
```

ブラウザで `http://localhost:5173` を開くと、固定のスラッグ `hello-world` に対応するレコードが表示されます。

## kintone に接続する

1. `apps/embed-demo/.env.example` をコピーして `apps/embed-demo/.env.local` を作成します。
2. 以下の値を kintone の環境に合わせて設定します。

   ```dotenv
   VITE_KINTONE_BASE_URL="https://{サブドメイン}.cybozu.com"
   VITE_KINTONE_APP_ID="{アプリ ID}"
   VITE_KINTONE_API_TOKEN="{API トークン}"
   ```

3. API トークンにはレコード閲覧権限を付与し、対象フィールドにアクセスできるようにしてください。

設定後に再度 `pnpm dev --filter @cmk/embed-demo` を実行すると、kintone から `slug` フィールドで一致したレコードが読み込まれます。該当レコードが見つからない場合はエラーメッセージが表示されます。

## 補足

- デモは `<cmk-embed>` 要素を 1 つだけ配置していますが、複数配置しても問題ありません。
- 遅延ハイドレーション (`IntersectionObserver`) を有効にするため、スクロールインで読み込まれる挙動も確認できます。
- デモのモックデータは `apps/embed-demo/src/mockData.ts` に定義されています。必要に応じてフィールド構成を追加して検証できます。
