/**
 * プロンプト作成時の推奨構成（SEO・LLMO）を表示する注意書きページ
 */
export default function NoticePage() {
  return (
    <div className="w-full py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">注意書き</h1>
      <p className="text-sm text-[#64748B] mb-8">
        一次執筆のプロンプトに含める内容の目安です。システム側の出力形式（番号見出し・太字ルール等）と併せてご利用ください。
      </p>

      <div
        className="rounded-xl border border-[#0e357f]/20 bg-[#f8fafc] p-6 sm:p-8 shadow-sm mb-8"
        style={{ boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)' }}
      >
        <h2 className="text-lg font-bold text-[#0e357f] border-b-2 border-[#0e357f] pb-2 mb-4">
          ■ ターゲットキーワード（必須・構造化データ）
        </h2>
        <p className="text-sm text-[#334155] leading-relaxed mb-4">
          一次執筆の際の<strong className="font-semibold text-[#1A1A2E]">ターゲットキーワードは必ず入れてください</strong>。
        </p>
        <p className="text-sm text-[#334155] leading-relaxed mb-4">
          入力内容は、WordPress 投稿に含まれる構造化データ（JSON-LD）の{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono text-[#0e357f] border border-slate-200">
            keywords
          </code>{' '}
          に反映されます。コード（裏側）の記述例は次の通りです。
        </p>
        <pre
          className="mb-4 overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-[#1e293b] font-mono"
          tabIndex={0}
        >{`"keywords": "M&A 手数料 高い, ma 手数料, M&A手数料, M&A コスト",`}</pre>
        <p className="text-sm text-[#334155] leading-relaxed">
          Google でユーザーがそれらの検索をしたときに表示される仕組みになっているため、
          <strong className="font-semibold text-[#1A1A2E]">とても重要な項目</strong>です。
        </p>
      </div>

      <div
        className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
        style={{ boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)' }}
      >
        <p className="text-[#334155] leading-relaxed mb-8 font-medium">
          プロンプトに関しては、以下を含めることを推奨します。
        </p>

        <h2 className="text-lg font-bold text-[#0e357f] border-b-2 border-[#0e357f] pb-2 mb-6">
          ■ 構成要件（SEO・LLMO最適化）
        </h2>
        <p className="text-sm text-[#64748B] mb-6">
          以下の構造で出力するよう指示してください。
        </p>

        <ol className="space-y-5 text-[#1e293b]">
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-[#002C93] w-8">①</span>
            <div>
              <span className="font-semibold text-[#1A1A2E]">タイトル</span>
              <span className="text-[#64748B] text-sm block mt-0.5">
                32文字以内・クリックされる設計
              </span>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-[#002C93] w-8">②</span>
            <div>
              <span className="font-semibold text-[#1A1A2E]">導入文</span>
              <span className="text-[#64748B] text-sm block mt-0.5">
                検索意図への共感＋記事の価値提示
              </span>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-[#002C93] w-8">③</span>
            <div>
              <span className="font-semibold text-[#1A1A2E]">結論要約</span>
              <span className="text-[#64748B] text-sm block mt-0.5">
                LLMO向けに先出しで要点整理
              </span>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-[#002C93] w-8">④</span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-[#1A1A2E]">本文（見出し構造）</span>
              <ul className="mt-3 space-y-2 text-sm text-[#475569] border-l-2 border-slate-200 pl-4 ml-1">
                <li>
                  <span className="font-semibold text-[#334155]">H2：</span>
                  本文内容に合わせる
                </li>
                <li>
                  <span className="font-semibold text-[#334155]">H2：</span>
                  本文内容に合わせる
                </li>
                <li>
                  <span className="font-semibold text-[#334155]">H2：</span>
                  本文内容に合わせる
                </li>
                <li>
                  <span className="font-semibold text-[#334155]">H3：</span>
                  各ポイントを具体的に解説
                </li>
              </ul>
              <p className="text-xs text-[#94a3b8] mt-2">
                ※ 実際の一次執筆では「1. 」「2. 」「2-1.」形式の見出しになります。プロンプトでは論点の階層イメージとして H2/H3 と書いて問題ありません。
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-[#002C93] w-8">⑤</span>
            <div>
              <span className="font-semibold text-[#1A1A2E]">日本提携支援ならではの視点（独自性）</span>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-[#002C93] w-8">⑥</span>
            <div>
              <span className="font-semibold text-[#1A1A2E]">まとめ</span>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-[#002C93] w-8">⑦</span>
            <div>
              <span className="font-semibold text-[#1A1A2E]">CTA</span>
              <span className="text-[#64748B] text-sm block mt-0.5">
                資料請求・相談への自然な導線
              </span>
            </div>
          </li>
        </ol>
      </div>
    </div>
  )
}
