# dog-sns-prototype

店舗分散型SNS自動投稿システムのフェーズ0プロトタイプです。

## 最重要方針

このプロジェクトは、ローカルWindows環境に何も持たない方針で進めます。

- ソースコードはGitHubに集約
- 実行・ビルド・プレビューはVercel
- DB、Storage、Auth、店舗設定、完成画像はSupabase
- ローカルPCでは `npm install`、`npm run dev`、Next.js初期化を原則行わない
- CodexはGitHubへ直接Pushし、ユーザーはVercel URLをiPad Safariで確認する

## Codex新スレッド開始時の指示

新しいCodexスレッドで作業を再開するときは、最初に以下を伝える。

```text
GitHub の hirotaro-suzuki/dog-sns-prototype が最新版です。
ローカルの Dropbox フォルダは参照しないでください。
まず GitHub 上の README.md と dog_sns_design.md を読んで、そこに書かれた方針を最優先してください。
このプロジェクトは「ローカルに何も持たない」方針です。
Codex は GitHub の main を正として作業してください。
先走って実装せず、読んだ内容と次に進む候補を確認してから止まってください。
```

短く伝える場合は以下でもよい。

```text
hirotaro-suzuki/dog-sns-prototype の GitHub最新版を正として、README.md と dog_sns_design.md を読んで続きから。ローカルは見ないで。先走らないで。
```

## フェーズ0で確認済みのこと

1. ブラウザでカメラを起動できる
2. 最大3枚まで撮影できる
3. 撮影画像をクラウドに送らず一時保持できる
4. 3枚から1枚を選べる
5. わんちゃん情報を入力できる
6. Canvasで日付、店舗表示、犬情報を合成できる
7. 写真位置をタッチで移動、拡大縮小、回転できる
8. 必要な場所だけ手動モザイクできる
9. 完成画像を生成できる

## 次の実装テーマ

次は、店舗ログイン、撮影画面での担当者選択、店舗ごとの写真枠・ロゴ・表示設定の連携を実装する。

方針:

- iPadは個人ではなく店舗としてログインする
- 担当者はログインではなく、撮影画面で都度選択する
- 店舗名、店舗ロゴ、写真枠、表示カラー、担当者一覧はSupabaseから取得する
- コード内に特定店舗名やフレームURLを直書きしない

## Vercel設定

VercelでこのGitHubリポジトリをImportしてください。

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: Next.js default

## 重要ドキュメント

詳しい開発方針は `dog_sns_design.md` を参照してください。
