# dog-sns-prototype

店舗分散型SNS自動投稿システムのプロトタイプです。

## 最重要方針

このプロジェクトは、GitHub の `main` ブランチを最新版・正本として進めます。

- ソースコードはGitHubに集約
- 実行・ビルド・プレビューはVercel
- DB、Storage、Auth、店舗設定、完成画像はSupabase
- ローカルPC上の作業環境や複製リポジトリを前提にしない
- CodexはGitHubへ直接反映し、ユーザーはVercel URLをiPad Safariで確認する

## Codex新スレッド開始時の指示

新しいCodexスレッドで作業を再開するときは、最初に以下を伝える。

```text
GitHub の hirotaro-suzuki/dog-sns-prototype の main が最新版です。
まず GitHub 上の README.md と dog_sns_design.md を必ず読んでください。
dog_sns_design.md が現時点の設計・開発方針の正本です。
必要に応じて docs/ownership-handoff.md と docs/session-2026-06-20.md も読んでください。
このプロジェクトは GitHub、Vercel、Supabase を正として進めます。
Codex は GitHub の main を正として作業してください。
私は73歳の素人で、バイブコーディングにチャレンジ中です。
できる限り、SQL確認、GitHub確認、Vercel確認、コード修正、手順整理などはCodex側で進めてください。
私が画面操作しないと進められない場合だけ、専門用語を減らして一歩ずつ案内してください。
各セッションの終わりや区切りでは、作業内容の記録に加えて、気づいた点や次に良くなる提案を1つ以上ください。
先走って実装せず、読んだ内容と次に進む候補を確認してから止まってください。
```

短く伝える場合は以下でもよい。

```text
hirotaro-suzuki/dog-sns-prototype の GitHub main を正として、README.md と dog_sns_design.md を必ず読んで続きから。dog_sns_design.md が現在の設計書です。私は73歳の素人なので、できる限りCodex側で進めて。各セッションで気づいた点や提案も添えて。先走らないで。
```

## 現在できていること

詳しい最新仕様は `dog_sns_design.md` を正とする。

現時点では、以下の流れが動作している。

1. 店舗コード + PINで店舗ログインできる
2. Supabaseから店舗情報と担当者一覧を取得できる
3. iPad Safariでカメラを起動できる
4. 最大3枚まで撮影できる
5. 撮影画像を長辺2400pxまでに軽量化し、クラウドへ送らず一時保持できる
6. 3枚から1枚を選べる
7. 写真選択後に担当者を選択できる
8. 写真をタッチで移動、拡大縮小、回転できる
9. 必要な場所だけ手動モザイクできる
10. 写真上へ短い文字ボックスを追加、選択、編集、削除できる
11. 文字ボックスは写真に連動して動く
12. 完成画像を生成できる
13. 完成画像確認から編集へ戻れる
14. 印刷ボタンでブラウザ標準の印刷画面を開ける

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
- iPadで、ログインから撮影フロー遷移まで動作確認済み

## 次の実装テーマ

次は、完成画像をSupabase Storageへ保存し、`assets` テーブルへ店舗・担当者・日時などのメタデータを登録する。

方針:

- iPadは個人ではなく店舗としてログインする
- 担当者はログインではなく、写真選択後に都度選択する
- 店舗名、店舗ロゴ、写真枠、表示カラー、担当者一覧はSupabaseから取得する
- コード内に特定店舗名やフレームURLを直書きしない
- ワンチャン情報はDB保存せず、写真上の文字として完成画像に焼き込む
- 完成画像や保存予定データに、店舗ID、店舗表示名、担当者ID、担当者名、撮影日時を保持する
- クラウド保存は、印刷後にSNS掲載OKをもらった完成画像だけにする

## Vercel設定

VercelでこのGitHubリポジトリをImportしてください。

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: Next.js default

## 重要ドキュメント

- 現在の設計・開発方針の正本: `dog_sns_design.md`
- 直近の作業ログ: `docs/session-2026-06-20.md`
- Supabaseセットアップ手順: `supabase/README.md`
- Supabaseテーブル設計: `supabase/schema.sql`
- Supabaseサンプルデータ: `supabase/seed.example.sql`
- 運用引き渡しメモ: `docs/ownership-handoff.md`
