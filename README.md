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

次のCodexスレッドで作業を再開するときは、`docs/next-thread-start.md` の指示文を最初に貼る。

短く伝える場合は以下でもよい。

```text
hirotaro-suzuki/dog-sns-prototype の GitHub main を正として、README.md と dog_sns_design.md を必ず読んで続きから。dog_sns_design.md が現在の設計書です。クラウド中心、引き継ぎやすさ優先、Codex一本で進める方針です。次は完成画像のSupabase保存とassets登録へ進む予定ですが、先走らず、読んだ内容と次に進む候補を確認してから止まってください。私は73歳の素人なので、できる限りCodex側で進め、必要な画面操作だけ専門用語を減らして案内してください。
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
10. 写真上へ短い文字ボックスを追加、選択、直接編集、水平化、削除できる
11. 文字ボックスは写真に連動して動く
12. 完成画像を生成できる
13. 完成画像確認から編集へ戻れる
14. 印刷ボタンでブラウザ標準の印刷画面を開ける
15. SNS掲載OKをもらった完成画像をSupabase StorageとDBへ保存できる
16. 本部用 `/admin` で保存済み写真を一覧、説明文更新、非表示/復帰できる

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

次は、保存済み完成画像からSNS投稿内容を作成・保存する機能へ進む。

方針:

- iPadは個人ではなく店舗としてログインする
- 担当者はログインではなく、写真選択後に都度選択する
- 店舗名、店舗ロゴ、写真枠、表示カラー、担当者一覧はSupabaseから取得する
- コード内に特定店舗名やフレームURLを直書きしない
- ワンチャン情報はDB保存せず、写真上の文字として完成画像に焼き込む
- 完成画像や保存予定データに、店舗ID、店舗表示名、担当者ID、担当者名、撮影日時を保持する
- クラウド保存は、印刷後にSNS掲載OKをもらった完成画像だけにする
- Supabase側の引き継ぎ方針は `docs/supabase-handoff.md` を正とする

## Vercel設定

VercelでこのGitHubリポジトリをImportしてください。

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: Next.js default

## 重要ドキュメント

- 次スレッド開始時の指示文: `docs/next-thread-start.md`
- 現在の設計・開発方針の正本: `dog_sns_design.md`
- Supabase引き継ぎメモ: `docs/supabase-handoff.md`
- 直近の作業ログ: `docs/session-2026-06-20.md`
- Supabaseセットアップ手順: `supabase/README.md`
- Supabaseテーブル設計: `supabase/schema.sql`
- Supabaseサンプルデータ: `supabase/seed.example.sql`
- 運用引き渡しメモ: `docs/ownership-handoff.md`
