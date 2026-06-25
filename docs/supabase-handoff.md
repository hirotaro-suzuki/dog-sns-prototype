# Supabase引き継ぎメモ

この文書は、Supabase側のDB、Storage、店舗設定を別の作業者へ引き継ぐためのメモである。

GitHub mainの `supabase/schema.sql` と `supabase/README.md` を正とし、この文書は運用時に迷いやすい点を補足する。

## 基本方針

- Supabaseには、完成画像と運用に必要なメタデータだけを保存する。
- 撮影途中の写真、選ばれなかった写真、未許諾写真、キャンセル写真は保存しない。
- ワンチャン情報はDB項目として保存しない。
- ワンチャン情報は、写真上の短い文字として完成画像に焼き込む。
- 店舗、担当者、ロゴ、フレーム、完成画像の保存先は、GitHub上のSQLと文書から追える状態にする。

## Storage

使うStorage bucketは以下。

### final-images

完成画像を保存する。

保存対象は、印刷後にお客様からSNS掲載OKをもらった完成画像だけ。

保存パス:

```text
[store_code]/[year]/[month]/[day]/[manage_code].jpg
```

例:

```text
DEMO_TOKYO/2026/06/25/DEMO_TOKYO-20260625-001.jpg
```

### store-assets

店舗ロゴ、写真フレームなど、店舗設定に使う画像を保存する。

推奨パス:

```text
stores/[store_code]/logo.png
stores/[store_code]/frame.png
```

店舗マスタ `stores.logo_url` と `stores.frame_url` には、Supabase Storageの公開URLを登録する。

## 主なテーブル

### stores

店舗マスタ。

店舗名、表示名、ログインコード、PINハッシュ、ロゴURL、フレームURL、テーマ色を持つ。

店舗を休止・閉店する場合も物理削除せず、`is_active = false` にする。

### staff_members

店舗ごとの担当者候補。

担当者が退職・異動した場合も物理削除せず、`is_active = false` にする。

### assets

保存済み完成画像の管理テーブル。

保存する中心情報:

- 管理コード
- 店舗ID、店舗コード、保存時点の店舗表示名
- 担当者ID、保存時点の担当者表示名
- 撮影日時、撮影日、店舗ごとの日次連番
- 完成画像URL
- Storage bucketとStorage path
- 保存時点のロゴURL、フレームURL、テーマ色
- 印刷日時
- SNS掲載合意日時
- 本部が追加する説明文
- 非表示日時、非表示理由
- 管理ステータス

保存しない情報:

- 犬種
- 犬齢
- オス・メス
- 名前
- 編集途中の文字ボックス情報

これらは完成画像に焼き込まれた見た目を正とする。

## 管理コード

`assets.manage_code` は、人間が見て分かる業務用コードである。

形式:

```text
[store_code]-[yyyymmdd]-[3桁連番]
```

例:

```text
DEMO_TOKYO-20260625-001
```

内部の主キーはUUID、現場や本部が見る管理コードは `manage_code` として分ける。

## 適用手順

新規Supabaseプロジェクトの場合:

1. Supabase SQL Editorで `supabase/schema.sql` を実行する。
2. 必要に応じて `supabase/seed.example.sql` を実行する。
3. Vercelに環境変数を設定する。
4. `store-assets` に店舗ロゴとフレームを入れる。
5. `stores.logo_url` と `stores.frame_url` を公開URLへ更新する。

既存Supabaseプロジェクトの場合:

1. Supabase SQL Editorで `supabase/migrations/20260625_assets_storage_handoff.sql` を実行する。
2. `assets` の犬情報項目が必須でなくなっていることを確認する。
3. `final-images` と `store-assets` bucketがあることを確認する。
4. 既存店舗の `logo_url` と `frame_url` を必要に応じて更新する。

## Vercel環境変数

最低限必要な環境変数:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` はサーバー側APIだけで使う。ブラウザへ出してはいけない。

本部用 `/admin` を使う場合は、追加で以下を設定する。

```text
ADMIN_MAINTENANCE_PIN
```

これは本部メンテナンス画面を開くための簡易PINである。将来、本格的な管理者ログインを作るまでは、このPINをVercelの環境変数で管理する。

## 本部メンテナンス

`/admin` では、保存済み完成画像を本部側で確認・整理する。

現在できること:

- 店舗を複数選択して写真を絞り込む
- 開始日・終了日で写真を絞り込む
- 非表示写真を含めて表示する
- 選択した写真に説明文を追加・更新する
- 写真を物理削除せず、`assets.status = 'archived'` として非表示にする
- 非表示写真を `assets.status = 'ready'` に戻す
- 店舗マスタの表示名、SNS表示名、Instagram、標準ハッシュタグ、ロゴURL、フレームURL、テーマカラー、有効/無効を編集する
- 担当者マスタの追加、表示名、役割、SNS承認可否、有効/無効、並び順を編集する

SNS投稿文の作成と保存は次フェーズで追加する。
店舗ログインコード、PINハッシュ、ロゴ・フレーム画像そのもののアップロードはまだ画面編集対象外とする。

## 保存の流れ

1. 店舗ログインで店舗情報と担当者一覧を取得する。
2. 撮影、写真選択、担当者選択、画像編集を行う。
3. 完成画像確認画面で印刷する。
4. お客様からSNS掲載OKをもらう。
5. 「SNS掲載OKをもらったので保存」ボタンを押す。
6. Vercelの `/api/assets` が完成画像を `final-images` へ保存する。
7. `/api/assets` が `assets` テーブルへメタデータを登録する。

この流れ以外では、完成画像をクラウドへ送らない。
