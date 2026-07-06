# 2026-07-06 正方形キャンバス化の作業ログ

最終更新: 2026-07-06

この文書は、店舗側の完成画像を正方形前提へ寄せるために行った最初の実装記録である。

GitHub mainを正本とし、ローカルPCやDropboxは参照しない。

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
- 枠が読めない場合の仮フレームも正方形Canvas内で描画する。
- 完成画像確認画面と印刷対象も正方形表示へ寄せた。

### Supabase

- `store_frames.date_x` と `store_frames.date_y` の基準を `0..1080` に変更するmigrationを追加した。
- 追加migration: `supabase/migrations/20260706_square_frame_coordinates.sql`
- `supabase/schema.sql` も正方形座標前提に更新した。
- `docs/supabase-handoff.md` と `supabase/README.md` に適用手順を追記した。

## 更新した主なファイル

- `src/components/MosaicCanvas.tsx`
- `src/app/frame-print-overrides.css`
- `src/app/api/admin/frames/route.ts`
- `src/app/api/admin/frames/[id]/route.ts`
- `supabase/schema.sql`
- `supabase/migrations/20260706_square_frame_coordinates.sql`
- `docs/supabase-handoff.md`
- `supabase/README.md`

## 未確認

- Vercelビルド成功
- iPad Safariでの撮影、編集、完成画像作成、保存の通し確認
- Supabase SQL Editorで `20260706_square_frame_coordinates.sql` を適用すること
- 正方形枠画像を登録した時の撮影画面、編集画面、完成画像の見え方
- 印刷時にAirPrintやSELPHY側で期待通り扱えるか

## 注意

既存のL版横向き枠は、正方形Canvas上では見え方が崩れる可能性がある。
正方形化後は、正方形用に作った枠画像を `store_frames` に登録し、既存L版枠は停止中または旧形式として扱う。

SNS自動投稿、Instagram連携、投稿本文生成は今回触っていない。
