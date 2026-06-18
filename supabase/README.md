# Supabase setup

このフォルダには、Supabase側で使うSQLを置く。

## 適用順

Supabase SQL Editorで、以下の順番で実行する。

1. `schema.sql`
2. `seed.example.sql`

`schema.sql` はテーブル、制約、インデックス、updated_atトリガー、RLS有効化を作成する。
`seed.example.sql` はログイン動作確認用のデモ店舗とデモ担当者を作成する。

## seed.example.sql の内容

`seed.example.sql` は本番データではない。動作確認用のサンプルである。

### デモ店舗

```text
store_code: DEMO_STORE
store_name: Demo Store
display_name: 今日のわんちゃん Demo
login_code: DEMO
PIN: 0000
theme_color: #176f62
print_template_type: default
timezone: Asia/Tokyo
sns_display_name: 今日のわんちゃん Demo
default_hashtags: #今日のわんちゃん #犬同伴OK
```

ログイン画面で試す値は以下。

```text
店舗コード: DEMO
PIN: 0000
```

`pin_hash` はデモ用に `sha256:` 形式で入れている。本番店舗では `scripts/create-store-pin-hash.mjs` で生成した `scrypt:` 形式を使う。

### デモ担当者

```text
staff_code: manager
display_name: 店長
role_label: 責任者
can_approve_sns: true
sort_order: 10
```

```text
staff_code: staff-a
display_name: 山田
role_label: ホール
can_approve_sns: false
sort_order: 20
```

```text
staff_code: staff-b
display_name: 佐藤
role_label: ホール
can_approve_sns: false
sort_order: 30
```

```text
staff_code: staff-c
display_name: 鈴木
role_label: キッチン
can_approve_sns: false
sort_order: 40
```

## 本番店舗データを作るとき

- 実店舗名、本物のPIN、実ロゴURL、実フレームURLをリポジトリに書かない。
- 本番PINは `scripts/create-store-pin-hash.mjs` でハッシュ化してからSupabaseへ登録する。
- 店舗や担当者を削除したい場合も、原則として物理削除ではなく `is_active = false` にする。
- ロゴやフレームはSupabase Storageなど、引き渡し先が管理できる場所に置く。

## Vercel環境変数

ログインAPIを動かすには、Vercelに以下の環境変数を設定する。

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` はサーバー側だけで使う。ブラウザに出してはいけない。
