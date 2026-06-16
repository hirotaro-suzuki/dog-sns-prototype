# dog-sns-prototype

店舗分散型SNS自動投稿システムのフェーズ0プロトタイプです。

## 最重要方針

このプロジェクトは、ローカルWindows環境に何も持たない方針で進めます。

- ソースコードはGitHubに集約
- 実行・ビルド・プレビューはVercel
- DB、Storage、Auth、店舗設定、完成画像はSupabase
- ローカルPCでは `npm install`、`npm run dev`、Next.js初期化を原則行わない
- CodexはGitHubへ直接Pushし、ユーザーはVercel URLをiPad Safariで確認する

## 方針

- GitHub上のソースをVercelへImportし、クラウド上でビルドする
- フェーズ0ではSupabaseや外部DBへ送信しない
- 撮影データはブラウザメモリ上のBlob/Object URLだけで一時保持する
- 未許諾写真、ボツ写真、途中データはクラウドへ送らない

## フェーズ0で確認すること

1. ブラウザでカメラを起動できる
2. 最大3枚まで撮影できる
3. 撮影画像をクラウドに送らず一時保持できる
4. 3枚から1枚を選べる
5. わんちゃん情報を入力できる
6. Canvasで日付、店舗表示、犬情報を合成できる
7. 写真位置をタッチで移動、拡大縮小、回転できる
8. 必要な場所だけ手動モザイクできる
9. 完成画像を生成できる

## Vercel設定

VercelでこのGitHubリポジトリをImportしてください。

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: Next.js default

## 重要ドキュメント

詳しい開発方針は `dog_sns_design.md` を参照してください。
