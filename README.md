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
私は73歳の素人で、バイブコーディングにチャレンジ中です。
できる限り、SQL確認、GitHub確認、Vercel確認、コード修正、手順整理などはCodex側で進めてください。
私が画面操作しないと進められない場合だけ、専門用語を減らして一歩ずつ案内してください。
各セッションの終わりや区切りでは、作業内容の記録に加えて、気づいた点や次に良くなる提案を1つ以上ください。
先走って実装せず、読んだ内容と次に進む候補を確認してから止まってください。
```

短く伝える場合は以下でもよい。

```text
hirotaro-suzuki/dog-sns-prototype の GitHub最新版を正として、README.md と dog_sns_design.md を読んで続きから。ローカルは見ないで。私は73歳の素人なので、できる限りCodex側で進めて。各セッションで気づいた点や提案も添えて。先走らないで。
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

## 2026-06-18 作業メモ

店舗ログインの最初の縦線を通した。

- Supabaseプロジェクト `Dog-sns-prototype` を作成
- Supabaseに `stores`、`staff_members`、`admin_users`、`assets`、`store_frames` を作成
- サンプル店舗 `DEMO / 0000` と担当者4名を投入
- Supabaseの `service_role` に必要なテーブル権限を付与
- VercelにSupabase接続用の環境変数を設定
- `/store/login` を作成
- 店舗コード + PINでSupabaseから店舗情報と担当者一覧を取得
- ログイン成功後、`/store` の店舗ホームへ遷移
- 店舗ホームで担当者を選択し、既存の撮影フローへ進める状態まで確認
- iPadで、ログインから撮影フロー遷移まで動作確認済み

## 次の実装テーマ

次は、店舗ログイン後に取得した店舗・担当者情報を、完成画像と将来の保存データへ最後まで残す。

方針:

- iPadは個人ではなく店舗としてログインする
- 担当者はログインではなく、撮影画面で都度選択する
- 店舗名、店舗ロゴ、写真枠、表示カラー、担当者一覧はSupabaseから取得する
- コード内に特定店舗名やフレームURLを直書きしない
- 完成画像や保存予定データに、店舗ID、店舗表示名、担当者ID、担当者名を保持する
- クラウド保存は、印刷後にSNS掲載OKをもらった完成画像だけにする

## Vercel設定

VercelでこのGitHubリポジトリをImportしてください。

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: Next.js default

## 重要ドキュメント

- 詳しい開発方針: `dog_sns_design.md`
- Supabaseセットアップ手順: `supabase/README.md`
- Supabaseテーブル設計: `supabase/schema.sql`
- Supabaseサンプルデータ: `supabase/seed.example.sql`
- 運用引き渡しメモ: `docs/ownership-handoff.md`
