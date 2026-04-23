/**
 * 生成された本文テキストに対する共通フォーマット正規化処理。
 *
 * Gemini / Claude は時折、本来なら「1-1. ラベル」の見出し + 段落として
 * 書くべきところを「**ラベル：本文**」のように行全体をマークダウン太字で
 * 囲んで出力することがある（とくに列挙系セクション）。
 * そのまま WordPress に投稿すると `<p><strong>...</strong></p>` になって
 * しまい、NTS テーマの見出し下線が効かず「太字段落が縦に並ぶ」崩れた
 * 見た目になる。
 *
 * ここでは、プレビュー表示と WordPress 変換の双方の入口でこの種の太字
 * ラップ行を検出し、見出し(`■ ラベル`) + 段落(本文) に分解することで、
 * 既存の h3 変換ルートに流し込む。
 */

/**
 * 本文中の「**ラベル：本文**」「**ラベル**」といった太字ラップ行を
 * 見出し+段落に正規化する。
 *
 * 変換例:
 *   `**M&Aの目的設定と戦略立案：なぜM&Aを行うのか...明確にします。**`
 *   ↓
 *   `■ M&Aの目的設定と戦略立案`
 *   ``（空行）
 *   `なぜM&Aを行うのか...明確にします。`
 *
 *   `**買い手の探索：...**` → `■ 買い手の探索` + 本文
 *   `**まとめ**` → `■ まとめ`
 *
 * ラベル長は 2〜60 文字までを対象とし、本文を伴うパターンのみ分解する。
 * ラベル内部に「。」が含まれる行は通常の太字強調とみなし変換しない。
 */
/**
 * 与えられた文字列の「括弧の外」にある最初のコロン（全角：または半角:）の
 * インデックスを返す。日本語・英語の括弧の両方を考慮する。見つからなければ -1。
 */
function findTopLevelColon(s: string): number {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '（' || ch === '(' || ch === '【' || ch === '「') depth++
    else if (ch === '）' || ch === ')' || ch === '】' || ch === '」')
      depth = Math.max(0, depth - 1)
    else if (depth === 0 && (ch === '：' || ch === ':')) return i
  }
  return -1
}

export function normalizeBoldLabelLines(content: string): string {
  if (!content) return content

  const lines = content.split('\n')
  const out: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // 行全体が ** ... ** で囲まれているか判定（末尾の軽い句読点は許容）
    const boldWrap = trimmed.match(
      /^\*\*([^*\n]{2,})\*\*[\s　]*[。．.、,：:]?[\s　]*$/,
    )
    if (boldWrap) {
      const inner = boldWrap[1]!.trim()
      const colonIdx = findTopLevelColon(inner)
      if (colonIdx > 0) {
        // ラベル + 本文 パターン（括弧の外のコロンで分割）
        const label = inner.slice(0, colonIdx).trim()
        const body = inner.slice(colonIdx + 1).trim()
        // ラベル側には句点「。」が含まれていないこと（= 見出しとして短い語句であること）
        // を条件にして、通常の太字強調文（例: 「〜〜。〜〜：〜〜」）を誤変換しない
        if (label && body && label.length <= 60 && !/。/.test(label)) {
          if (out.length > 0 && out[out.length - 1]!.trim() !== '') out.push('')
          out.push(`■ ${label}`)
          out.push('')
          out.push(body)
          out.push('')
          continue
        }
      } else if (inner.length <= 60 && !/。/.test(inner)) {
        // ラベルだけの短い行（句点なし）
        if (out.length > 0 && out[out.length - 1]!.trim() !== '') out.push('')
        out.push(`■ ${inner}`)
        out.push('')
        continue
      }
    }

    out.push(line)
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}
