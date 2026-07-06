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

店舗ごとに2〜3種類の枠を使う既存環境では、追加で以下を実行する。

```text
supabase/migrations/20260704_store_frames.sql
supabase/migrations/20260704_frame_date_settings.sql
supabase/migrations/20260706_square_frame_coordinates.sql
```

葡萄房の本店・軽井沢向け正方形枠を登録する場合は、正方形座標migrationの後に以下を実行する。

```text
supabase/migrations/20260706_budoubou_square_frames.sql
```

これらのmigrationは、現在の方針に合わせて以下を行う。

- `final-images` bucketを作成する
- `store-assets` bucketを作成する
- `assets` に `captured_at`、`saved_at`、`final_storage_bucket`、`final_storage_path` を追加する
- `assets` に `description`、`hidden_at`、`hidden_reason` を追加する
- 店舗ごとの写真枠と日付表示座標を追加する
- 写真枠の日付座標制約を正方形Canvas前提へ更新する
- 葡萄房 本店2枚、軽井沢3枚の正方形枠を `store_frames` へ登録する
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

店舗設定に使う画像を保存するためのbucket。既存互換のために残している。

現在の葡萄房向け正方形枠は、Supabase StorageではなくGitHub mainの `public/store-frames/` 配下に静的SVGとして置いている。`store_frames.frame_url` には `/store-frames/...svg` のパスを登録して使う。各SVGはロゴを内包しているため、ロゴ単体画像を別途アップロードしなくても表示できる。

`stores.logo_url` と `stores.frame_url` は互換用として残っているが、現在の標準運用では写真枠テーブル `store_frames` と枠画像内ロゴを使う。

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

`logo_url` と `frame_url` には確認用のSVGデータURLを入れている。これは、ログインした店舗ごとにDBの値が撮影画面と編集画面へ渡っていることを確認しやすくするための互換用データである。
本番店舗では、現在の標準として `store_frames` に正方形枠を登録し、ロゴは枠画像内へ含める。

`pin_hash` はデモ用に `sha256:` 形式で入れている。本番店舗では `scripts/create-store-pin-hash.mjs` で生成した `scrypt:` 形式を使う。

## 本番店舗データを作るとき

- 実店舗名、本物のPIN、実ロゴURL、実フレームURLをリポジトリに書かない。
- 本番PINは `scripts/create-store-pin-hash.mjs` でハッシュ化してからSupabaseへ登録する。
- 店舗や担当者を削除したい場合も、原則として物理削除ではなく `is_active = false` にする。
- 写真枠は `store_frames` で管理し、現在の標準では正方形枠画像内にロゴを含める。
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
