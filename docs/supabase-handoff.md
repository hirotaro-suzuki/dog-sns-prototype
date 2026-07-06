# Supabase引き継ぎメモ

この文書は、Supabase側のDB、Storage、店舗設定を別の作業者へ引き継ぐためのメモである。

GitHub mainの `supabase/schema.sql` と `supabase/README.md` を正とし、この文書は運用時に迷いやすい点を補足する。

## 基本方針

- Supabaseには、完成画像と運用に必要なメタデータだけを保存する。
- 撮影途中の写真、選ばれなかった写真、未許諾写真、キャンセル写真は保存しない。
- ワンチャン情報はDB項目として保存しない。
- ワンチャン情報は、写真上の短い文字として完成画像に焼き込む。
- 店舗、担当者、ロゴ、フレーム、完成画像の保存先は、GitHub上のSQLと文書から追える状態にする。
- GitHub mainを正本とし、ローカルPCやDropboxを正本にしない。

## Storage

### final-images

完成画像を保存する。
保存対象は、印刷後にお客様からSNS掲載OKをもらった完成画像だけ。

保存パス:

```text
[store_code]/[year]/[month]/[day]/[manage_code].jpg
```

### store-assets

店舗フレームなど、店舗設定に使う画像を保存する。
現在の方針では、ロゴは単独素材ではなく写真枠画像内に含める。既存の `stores.logo_url` は互換用として残っているが、後続で削除または非表示にする。

## 主なテーブル

### stores

店舗マスタ。
店舗名、表示名、ログインコード、PINハッシュ、ロゴURL、フレームURL、テーマ色を持つ。
店舗を休止・閉店する場合も物理削除せず、`is_active = false` にする。

### staff_members

店舗ごとの担当者候補。
担当者が退職・異動した場合も物理削除せず、`is_active = false` にする。

### store_frames

店舗ごとの写真枠を管理するテーブル。

正方形化後の枠座標は、1080 x 1080 の正方形Canvasを基準に扱う。
`date_x` と `date_y` は 0 から 1080 の範囲で保存する。

既存Supabase環境では、`supabase/migrations/20260706_square_frame_coordinates.sql` を適用して、日付座標の既定値と制約を正方形前提へ更新する。

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
- 本部が使う40文字以内の一言メモ `short_caption`
- 本部確認状態 `review_status`
- 非表示日時、非表示理由
- 管理ステータス

`review_status` の内部値:

```text
new        未確認
candidate  投稿候補
hold       保留
rejected   使用しない
```

`review_status` はSNS投稿済み状態ではなく、本部が保存済み写真を整理するための確認状態である。

保存しない情報:

- 犬種
- 犬齢
- オス・メス
- 名前
- 編集途中の文字ボックス情報

これらは完成画像に焼き込まれた見た目を正とする。

## 管理コード

`assets.manage_code` は、人間が見て分かる業務用コードである。

```text
[store_code]-[yyyymmdd]-[3桁連番]
```

内部の主キーはUUID、現場や本部が見る管理コードは `manage_code` として分ける。

## 適用状況

ユーザー操作により、Supabase SQL Editorで `supabase/migrations/20260704_admin_asset_review_fields.sql` を適用済み。

SQL Editorの結果:

```text
Success. No rows returned
```

これにより、`assets.short_caption`、`assets.review_status`、40文字制約、確認状態値制約、検索用indexはSupabase本体へ反映済みと扱う。

`supabase/migrations/20260706_square_frame_coordinates.sql` は、正方形枠へ移行するための追加migrationである。正方形枠を本登録する前にSupabase SQL Editorで適用する。

## 適用手順

新規Supabaseプロジェクトの場合:

1. Supabase SQL Editorで `supabase/schema.sql` を実行する。
2. 必要に応じて `supabase/seed.example.sql` を実行する。
3. Vercelに環境変数を設定する。
4. `store-assets` に店舗フレームを入れる。
5. `store_frames.frame_url` に公開URLを登録する。

既存Supabaseプロジェクトで別環境へ再適用する場合:

1. Supabase SQL Editorで `supabase/migrations/20260625_assets_storage_handoff.sql` を実行済みか確認する。
2. Supabase SQL Editorで `supabase/migrations/20260704_frame_date_settings.sql` を実行済みか確認する。
3. Supabase SQL Editorで `supabase/migrations/20260704_admin_asset_review_fields.sql` を実行する。
4. Supabase SQL Editorで `supabase/migrations/20260706_square_frame_coordinates.sql` を実行する。
5. `assets` に `short_caption` と `review_status` が追加されたことを確認する。
6. `review_status` の既存写真が初期値 `new` になっていることを確認する。
7. `store_frames.date_x` と `store_frames.date_y` が 0 から 1080 の範囲になっていることを確認する。
8. `final-images` と `store-assets` bucketがあることを確認する。
9. 既存店舗の写真枠設定を必要に応じて確認する。

注意:

- GitHub mainにAPI/UI変更が反映済みで、現Supabaseにも `20260704_admin_asset_review_fields.sql` は適用済み。
- 別Supabase環境へ移す場合は、同じmigrationを忘れずに適用する。
- 本番DBへ適用したSQLは、必ず `supabase/migrations/` にも記録する。今回の追加SQLはGitHub mainへ記録済み。

## Vercel環境変数

最低限必要な環境変数:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_MAINTENANCE_PIN
```

`SUPABASE_SERVICE_ROLE_KEY` はサーバー側APIだけで使う。ブラウザへ出してはいけない。
`ADMIN_MAINTENANCE_PIN` は本部メンテナンス画面を開くための簡易PINであり、GitHubへ値を記録しない。

## 本部メンテナンス

`/admin` では、保存済み完成画像を本部側で確認・整理する。

現在できること:

- 店舗を複数選択して写真を絞り込む
- 開始日・終了日で写真を絞り込む
- 非表示写真を含めて表示する
- 確認状態で写真を絞り込む
- 日付順、店順で写真を並べ替える
- 日付順は新しい順、古い順を切り替える
- 写真カードで確認状態と一言メモを見る
- 写真一覧でチェックボックスによる複数選択を行う
- 選択した写真を詳細画面で順番に確認する
- 選択した写真に40文字以内の一言メモを追加・更新する
- 選択した写真の本部確認状態を更新する
- 写真を物理削除せず、`assets.status = 'archived'` として非表示にする
- 非表示写真を `assets.status = 'ready'` に戻す
- 店舗マスタの表示名、SNS表示名、Instagram、標準ハッシュタグ、ロゴURL、フレームURL、テーマカラー、有効/無効を編集する
- 担当者マスタの追加、表示名、役割、SNS承認可否、有効/無効、並び順を編集する

GitHub mainへ反映済みのDB/API/UI土台:

- 一覧取得APIで `short_caption` と `review_status` を返す
- 一覧取得APIで `sortMode=store|date` を受ける
- 一覧取得APIで `dateOrder=desc|asc` を受ける
- 一覧取得APIで `reviewStatus=new|candidate|hold|rejected` を受ける
- 個別更新APIで `shortCaption` と `reviewStatus` を更新できる
- 個別更新APIで40文字超過の一言メモと不正な確認状態を拒否する
- 写真タブUIで確認状態、一言メモ、確認状態フィルター、日付順/店順、日付の新しい順/古い順を操作できる
- 写真タブUIで一覧/詳細を分離し、複数選択した写真を順番に確認できる
- 開始日、終了日のiPad Safari標準日付入力による括弧表示を避けるため、`YYYY-MM-DD` の代理入力欄を表示する

SNS投稿文の作成と保存、SNS自動投稿、Instagram連携は次フェーズ以降で検討する。
店舗ログインコード、PINハッシュ、完全削除、Storageファイル削除はまだ画面編集対象外とする。

## 保存の流れ

1. 店舗ログインで店舗情報と担当者一覧を取得する。
2. 撮影、写真選択、担当者選択、画像編集を行う。
3. 完成画像確認画面で必要に応じて印刷する。
4. お客様からSNS掲載OKをもらう。
5. 「保存」ボタンを押す。
6. Vercelの `/api/assets` が完成画像を `final-images` へ保存する。
7. `/api/assets` が `assets` テーブルへメタデータを登録する。
8. 本部側 `/admin` が保存済み写真を確認し、必要に応じて一言メモと確認状態を付ける。

この流れ以外では、完成画像をクラウドへ送らない。
