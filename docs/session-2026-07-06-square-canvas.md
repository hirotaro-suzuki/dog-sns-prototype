# 2026-07-06 正方形キャンバス化の作業ログ

最終更新: 2026-07-07（Claude Codeが追記）

この文書は、店舗側の完成画像を正方形前提へ寄せるために行った最初の実装記録である。

GitHub mainとCodespacesを正本とし、ローカルPCやDropboxは参照しない。

## 目的

前半システムで保存する完成画像を、SNS投稿素材として扱いやすい正方形へ移行する。

対象は、店舗側iPadで撮影、編集、顧客確認、SNS掲載OK後にSupabaseへ保存する完成画像である。

## 反映したこと

### 撮影・枠プレビュー

- 撮影画面の枠プレビューを正方形表示へ変更した。
- 本部 `/admin` の枠プレビューを正方形表示へ変更した。
- 本部 `/admin` の保存済み写真サムネイルも正方形表示へ寄せた。

### 完成画像Canvas

- `src/components/MosaicCanvas.tsx` のCanvas基準を `1080 x 1080` に変更した。
- 写真移動、拡大縮小、回転、モザイク、文字位置は既存の座標変換ロジックを維持した。
- 枠画像は `1080 x 1080` に描画する。
- 枠が読めない場合だけ、ロゴ・店名・担当者名・日付を含まない簡易の正方形枠を描画する。
- 実枠がある場合は簡易枠を重ねない。
- 完成画像確認画面と印刷対象も正方形表示へ寄せた。

### 葡萄房の正方形枠（初回版・現在は停止中）

添付の背景透過ロゴPNGを枠SVG内に埋め込み、正方形フレームを5枚追加した。

本店用:

- `public/store-frames/budoubou-honten-classic-camel.svg`
- `public/store-frames/budoubou-honten-noir-gold.svg`

軽井沢用:

- `public/store-frames/budoubou-karuizawa-ivory-wine.svg`
- `public/store-frames/budoubou-karuizawa-charcoal-gold.svg`
- `public/store-frames/budoubou-karuizawa-forest-gold.svg`

各SVGは `data:image/png;base64` でロゴを内包しているため、Supabase Storageへ別途ロゴPNGを登録せずにVercel配信だけで表示できる。

**注意**: これら5枚は、実際にはキャンバス自体は正方形でも、上下の帯が厚く左右が薄いテンプレートのため、写真が見える部分が横長になっていた。2026-07-07にこの5枚は停止し、実ロゴ入りの新しい正方形枠へ差し替えた（下記「2026-07-07 追加修正 その2」参照）。ファイル自体とmigrationの記録は残す。

### Supabase

- `store_frames.date_x` と `store_frames.date_y` の基準を `0..1080` に変更するmigrationを追加した。
- 追加migration: `supabase/migrations/20260706_square_frame_coordinates.sql`
- 葡萄房 本店2枚、軽井沢3枚を登録するmigrationを追加した。
- 追加migration: `supabase/migrations/20260706_budoubou_square_frames.sql`
- `20260706_budoubou_square_frames.sql` は、対象店舗の既存有効枠を停止し、正方形枠を有効枠として登録する。
- `supabase/schema.sql` も正方形座標前提に更新した。
- `docs/supabase-handoff.md` と `supabase/README.md` に適用手順を追記した。

## 2026-07-07 追加修正

実枠画像がある時に、古い臨時枠や日付、担当者名、店名が重なる問題を修正した。

- `src/components/MosaicCanvas.tsx` の枠描画を整理した。
- 実枠画像がある場合は、その枠画像だけを合成する。
- 枠画像がない場合だけ、ロゴ・店名・担当者名・日付を含まない簡易の正方形枠を表示する。
- Codespacesで `npm run build` 成功を確認した。
- GitHub main反映済みコミット: `868c413725b4092f2ad387f81740081831830d00`

## 2026-07-07 追加修正 その2（Claude Code）

前日の修正後も撮影画面の枠が想定と違って見えるという報告から調査し、以下を修正した。

- **Admin「枠」タブの表示バグ**: 枠一覧APIが有効/無効・標準を無視して並べていたため、Adminを開くと停止中の古い枠が最初に選択されて見えていた（iPad側は元々正しく有効・標準の枠を表示していた）。`is_active → is_default → sort_order` の優先順で並べ替えるよう修正し、iPadが実際に使う枠には一覧で目印を表示するようにした。
- **担当者の所属店舗が編集パネルに出ていなかった**ので、選択中の担当者の所属店舗名を表示するようにした。
- **葡萄房の枠デザインを実ロゴ入りへ差し替え**: 旧5枚のテンプレートは写真窓が横長だったため停止し、ユーザー提供のロゴ画像（本店=ラクダ、軽井沢=ワイングラス柄）を下部中央に合成した、正方形の写真窓を持つ枠を本店・軽井沢それぞれ1枚ずつ新規作成した。
  - `public/store-frames/budoubou-honten-square.svg`
  - `public/store-frames/budoubou-karuizawa-square.svg`
  - 元ロゴ画像は `public/store-frames/source/` に保管。
  - Supabase反映用: `supabase/migrations/20260707_budoubou_square_photo_frames.sql`（旧5枠を停止し、新枠2枚を有効・標準として登録。ユーザーがSQL Editorで適用済み）
- **日付が完成画像に出なくなっていた回帰を修正**: 前日の枠重なり修正で、簡易枠のテキスト削除と一緒に日付描画の呼び出し自体を誤って削除していた。実枠画像を使う場合にだけ日付を描画するよう復元した（`drawFrameDate`）。ユーザーがiPadで日付表示を確認済み。
- **Admin「店舗」「担当者」「枠」タブに「停止中も表示」チェックボックスを追加**: 写真タブには既にあった絞り込みが3タブには無く、無効なデモデータ等が常に混ざって見えていたため、同じパターンで揃えた。デフォルトは有効なものだけ表示。ユーザーが動作確認済み。

コミット: `c33c67e`（枠並び順・所属店舗表示）、`6b8e490`・`5bbc85d`（新枠デザイン）、`9e2df86`（日付回帰修正）、`62b179f`（停止中も表示チェックボックス）。すべてGitHub main反映・push済み。

## 更新した主なファイル

- `src/components/MosaicCanvas.tsx`
- `src/app/frame-print-overrides.css`
- `src/app/api/admin/frames/route.ts`
- `src/app/api/admin/frames/[id]/route.ts`
- `public/store-frames/budoubou-honten-classic-camel.svg`（停止中）
- `public/store-frames/budoubou-honten-noir-gold.svg`（停止中）
- `public/store-frames/budoubou-karuizawa-ivory-wine.svg`（停止中）
- `public/store-frames/budoubou-karuizawa-charcoal-gold.svg`（停止中）
- `public/store-frames/budoubou-karuizawa-forest-gold.svg`（停止中）
- `public/store-frames/budoubou-honten-square.svg`（現行）
- `public/store-frames/budoubou-karuizawa-square.svg`（現行）
- `public/store-frames/source/`（ロゴ元画像）
- `src/components/AdminMaintenance.tsx`
- `src/app/api/admin/frames/route.ts`
- `supabase/schema.sql`
- `supabase/migrations/20260706_square_frame_coordinates.sql`
- `supabase/migrations/20260706_budoubou_square_frames.sql`（停止中に切替）
- `supabase/migrations/20260707_budoubou_square_photo_frames.sql`（現行）
- `docs/supabase-handoff.md`
- `supabase/README.md`

## 確認済み（2026-07-07時点）

- Vercel最新デプロイ成功（コミット `868c413` および `62b179f` まで確認済み）
- iPadで日付表示、Adminの枠並び順・所属店舗表示・停止中フィルターの動作
- Supabase SQL Editorで `20260706_square_frame_coordinates.sql` `20260706_budoubou_square_frames.sql` `20260707_budoubou_square_photo_frames.sql` を適用済み

## 未確認

- iPad Safariでの撮影から保存までの通し確認（一部確認済みだが全工程ではない）
- 新しい正方形枠（実ロゴ入り）でのSNS掲載OK後の保存・印刷の見え方
- 印刷時にAirPrintやSELPHY側で期待通り扱えるか

## 注意

既存のL版横向き枠は、正方形Canvas上では見え方が崩れる可能性がある。
正方形化後は、正方形用に作った枠画像を `store_frames` に登録し、既存L版枠は停止中または旧形式として扱う。

SNS自動投稿、Instagram連携、投稿本文生成は今回触っていない。
