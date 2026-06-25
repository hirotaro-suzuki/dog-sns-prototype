# Supabase setup

このフォルダには、Supabase側で使うSQLを置く。

## 適用順

新規Supabaseプロジェクトでは、Supabase SQL Editorで以下の順番で実行する。

1. `schema.sql`
2. `seed.example.sql`

`schema.sql` はテーブル、制約、インデックス、updated_atトリガー、RLS有効化、サーバー用APIキーからのテーブル操作権限を作成する。
`seed.example.sql` はログイン動作確認用のデモ店舗とデモ担当者を作成する。

既に古い `schema.sql` を適用済みのSupabaseプロジェクトでは、以下を実行する。

```text
supabase/migrations/20260625_assets_storage_handoff.sql
```

このmigrationは、現在の方針に合わせて以下を行う。

- `final-images` bucketを作成する
- `store-assets` bucketを作成する
- `assets` に `captured_at`、`saved_at`、`final_storage_bucket`、`final_storage_path` を追加する
- `assets` に `description`、`hidden_at`、`hidden_reason` を追加する
- 犬情報項目を必須ではなくす

詳しい引き継ぎメモは `docs/supabase-handoff.md` を読む。

## Storage bucket

現在使うStorage bucketは2つ。

```text
final-images
```

印刷後にSNS掲載OKをもらった完成画像だけを保存する。

```text
store-assets
```

店舗ロゴ、写真フレームなどを保存する。

店舗マスタ `stores.logo_url` と `stores.frame_url` には、`store-assets` に置いた画像の公開URLを登録する。

## 既にschema.sqlを適用済みで権限エラーが出る場合

ログイン画面で以下のような確認用メッセージが出た場合は、Supabase SQL Editorで下のSQLだけを実行する。

```text
permission denied for table stores
```

```sql
grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.stores,
  public.staff_members,
  public.admin_users,
  public.assets,
  public.store_frames
  to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
```

これはブラウザから誰でも読めるようにする設定ではない。Vercel上のサーバー処理だけが、必要なテーブルを扱えるようにする設定である。

## seed.example.sql の内容

`seed.example.sql` は本番データではない。動作確認用のサンプルである。

### デモ店舗

2つの店舗を作成する。どちらもPINは `0000`。

```text
店舗コード: TOKYO
PIN: 0000
表示名: 今日のわんちゃん 東京店
テーマ色: #176f62
担当者: 東京 店長 / 東京 山田 / 東京 佐藤
```

```text
店舗コード: KARUIZAWA
PIN: 0000
表示名: 今日のわんちゃん 軽井沢店
テーマ色: #6f4a8e
担当者: 軽井沢 店長 / 軽井沢 鈴木 / 軽井沢 高橋
```

`logo_url` と `frame_url` には確認用のSVGデータURLを入れている。これは、ログインした店舗ごとにDBの値が撮影画面と編集画面へ渡っていることを確認しやすくするためである。
本番店舗では、この2項目をSupabase Storageの公開URLへ置き換える。

`pin_hash` はデモ用に `sha256:` 形式で入れている。本番店舗では `scripts/create-store-pin-hash.mjs` で生成した `scrypt:` 形式を使う。

## 本番店舗データを作るとき

- 実店舗名、本物のPIN、実ロゴURL、実フレームURLをリポジトリに書かない。
- 本番PINは `scripts/create-store-pin-hash.mjs` でハッシュ化してからSupabaseへ登録する。
- 店舗や担当者を削除したい場合も、原則として物理削除ではなく `is_active = false` にする。
- ロゴやフレームはSupabase Storageなど、引き渡し先が管理できる場所に置く。
- ワンチャン情報はDB項目として保存せず、完成画像に焼き込まれた文字を正とする。

## Vercel環境変数

ログインAPIを動かすには、Vercelに以下の環境変数を設定する。

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_MAINTENANCE_PIN
```

`SUPABASE_SERVICE_ROLE_KEY` はサーバー側だけで使う。ブラウザに出してはいけない。
`ADMIN_MAINTENANCE_PIN` は本部用 `/admin` を開くための簡易PINである。
