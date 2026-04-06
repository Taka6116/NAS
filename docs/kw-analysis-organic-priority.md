# 競合KW（オーガニック）のスコア・優先度

Site Explorer からエクスポートしたオーガニックキーワードCSV向けのロジックです。狙い目KW（Keywords Explorer）とは別計算です。

## 方針

- **スコア** `calculateOrganicActionScore`: 現在順位・流入変動（traffic change）・検索ボリュームを組み合わせた施策優先度の目安。**KD は含めない**。
- **優先度** `calcPriorityOrganic`（★0〜3）: 順位帯・流入減・ボリューム・SVトレンドからルール判定。**KD は使わない**。

## 狙い目KWとの差

| 項目 | 狙い目KW | 競合KW |
|------|----------|--------|
| 主な入力 | Volume, KD, CPC, SV Trend | 順位, 流入変動, Volume, SV Trend |
| KD | スコア・優先度に使用 | 不使用 |

## 実装

- `src/lib/ahrefsAnalyzer.ts`: `calculateOrganicActionScore`, `calcPriorityOrganic`, `analyzeOrganicKeywords`, `mergeAndAnalyzeOrganic`
- `app/ahrefs/page.tsx`: 競合KWタブで `mergeAndAnalyzeOrganic` を使用
