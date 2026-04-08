# 設計: 推敲時の S3 参照 ＋ 画像ステップのプレビューローディング

## 1. 目的

1. **推敲（二次執筆）でも**、一次執筆時と**同一の参照範囲**で社内資料（S3 md/csv/txt およびアップロード資料）を Gemini に渡し、NTS 独自性の補強を図る。
2. 画像生成画面で「プレビューへ」を押した直後、下書き保存〜遷移まで**フィードバックが無い**問題を解消する。

## 2. 推敲＋S3 の設計原則（懸念の払拭）

| 懸念 | 対策 |
|------|------|
| 下書きと推敲で別のランダム断片になる | 一次執筆完了時に **`DraftMaterialBinding`**（fileIds・s3Keys・windowStart・contextLimit・originalLen・wasTruncated）を生成し、**sessionStorage** に保存。推敲 API はこれを受け取り、**同じ連結ルールで全文を再構築し、同一ウィンドウをスライス**する。 |
| トークン肥大 | 下書きと同じ **`GEMINI_DRAFT_MAX_CONTEXT_CHARS`** を上限とし、推敲用にも**追加で別の巨大コンテキストは持ち込まない**。 |
| ユーザー編集との衝突 | プロンプトで **【元記事】優先**・意図的削除の尊重・資料と矛盾時は元記事を正とする・メタ表現禁止を明示。 |
| 資料更新で窓がズレる | 再構築後の `full.length` と `originalLen` を比較し、**不一致時はサーバーログに warn**（ベストエフォート）。 |
| クライアント改ざん | バインディングは「どのキーを読むか」の指定に過ぎない。**実体は常にサーバー側で S3/ディスクから再取得**。配列長に上限。 |
| 手入力のみの記事 | バインディング無しのときは **従来どおり推敲のみ**（後方互換）。 |

## 3. データ型: `DraftMaterialBinding`

- `version`: `1`（将来の互換用）
- `fileIds`: 一次執筆リクエストで使ったアップロード ID（順序固定）
- `s3Keys`: 実際に読み込んだ S3 オブジェクトキー（順序固定）
- `windowStart` / `contextLimit` / `originalLen` / `wasTruncated`: ランダム窓再現用

一次執筆 API 応答に `materialBinding` を含め、フロントは `sessionStorage`（`nas_draft_material_binding`）に JSON 保存。新規作成・リセット・保存記事を開いた直後はキーを削除。

## 4. 実装モジュール

- **`src/lib/draftMaterialsContext.ts`** — 連結・窓・`materializeBoundMaterialsForPrompt`・`parseDraftMaterialBinding`
- **`src/lib/draftMaterialBindingSession.ts`** — sessionStorage キー定数
- **`app/api/gemini/draft/route.ts`** — lib 利用＋`materialBinding` 返却
- **`app/api/gemini/route.ts`** — `draftMaterialBinding` 受信・資料文字列化・`refineArticleWithGemini`（`maxDuration: 120`）
- **`src/lib/api/gemini.ts`** — `refineArticleWithGemini(..., referenceMaterialsContext?)`
- **`ArticleInput.tsx`** — 一次執筆成功時に binding を session へ
- **`app/editor/page.tsx`** — 推敲 POST に binding 同梱、リセット・新規・クリア・保存記事読込時に session 削除
- **`ImageResult.tsx`** — プレビュー用フルスクリーンローディング

## 5. プレビューローディング

- `previewNavigating` で二重クリック防止
- 全画面オーバーレイ、#1B2A4A トンマナ、リング＋Sparkles
- 文言: **下書き保存とプレビューを作成中です**

## 6. 将来拡張（範囲外）

- 要約キャッシュ、長さ不一致時の UI 通知、推敲専用要約パイプライン
