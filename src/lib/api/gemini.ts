import { GoogleGenerativeAI } from '@google/generative-ai'

/** 429/クォータ超過時に順に試すモデル（モデルごとに別枠のことがある） */
const GEMINI_MODELS = ['gemini-2.5-flash'] as const

/** SDK / Google 側のエラーをログ・ユーザー向け詳細用に1行にまとめる */
function formatGeminiCaughtError(e: unknown): string {
  if (e instanceof Error) {
    const withCause = e as Error & { cause?: unknown }
    const tail =
      withCause.cause !== undefined && withCause.cause !== null
        ? ` | cause: ${formatGeminiCaughtError(withCause.cause)}`
        : ''
    return `${e.message}${tail}`
  }
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Google 429 応答の「Please retry in 24.9s」や RetryInfo から待機秒を読む */
function parseRetryDelaySeconds(detail: string): number | null {
  const m1 = detail.match(/Please retry in ([\d.]+)\s*s/i)
  if (m1) {
    const sec = parseFloat(m1[1]!)
    if (Number.isFinite(sec) && sec >= 0) return Math.min(sec, 120)
  }
  const m2 = detail.match(/"retryDelay"\s*:\s*"(\d+)s"/i)
  if (m2) {
    const sec = parseInt(m2[1]!, 10)
    if (Number.isFinite(sec) && sec >= 0) return Math.min(sec, 120)
  }
  return null
}

/**
 * 指定プロンプトで generateContent を実行する。
 * 429（クォータ・分間トークン上限）時は API が示す秒数だけ待って同一モデルを再試行し、
 * それでもダメなら次モデルへ（現状は1モデルのみ）。
 */
async function generateContentWithFallback(apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  /** 初回 + 待機後1回のみ（待機25秒×多回は Vercel の関数時間制限に抵触しやすい） */
  const maxQuotaRetriesPerModel = 2
  let lastError: Error | null = null
  let lastDetail = ''

  for (const modelId of GEMINI_MODELS) {
    for (let attempt = 0; attempt < maxQuotaRetriesPerModel; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelId })
        const result = await model.generateContent(prompt)
        return result.response.text()
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
        lastDetail = formatGeminiCaughtError(e)
        console.error(`[Gemini] model=${modelId} attempt=${attempt + 1}/${maxQuotaRetriesPerModel} 失敗:`, lastDetail)
        const msg = lastError.message
        const isQuota = /429|quota|Too Many Requests|Resource exhausted|RESOURCE_EXHAUSTED/i.test(msg) ||
          /429|quota|Resource exhausted|RESOURCE_EXHAUSTED/i.test(lastDetail)
        if (!isQuota) throw lastError

        const waitSec = parseRetryDelaySeconds(lastDetail)
        const canRetry = attempt < maxQuotaRetriesPerModel - 1
        if (canRetry && waitSec != null) {
          const ms = Math.ceil(waitSec * 1000) + 800
          console.warn(`[Gemini] クォータ緩和のため ${ms}ms 待機して再試行します (${modelId})`)
          await sleep(ms)
          continue
        }
        break
      }
    }
  }

  const suffix = lastDetail ? ` [詳細: ${lastDetail}]` : ''
  console.error('[Gemini] クォータ扱いで全モデル失敗', { models: [...GEMINI_MODELS], lastDetail })
  throw new Error(
    'Gemini API の利用上限（無料枠は「1分あたりの入力トークン」など）に達しています。' +
      'しばらく待つか、参照資料（S3）を減らすか、Google AI Studio で課金を有効にしてください。' +
      suffix
  )
}

const TITLE_MARKER = '<<<TITLE>>>'
const BODY_MARKER = '<<<BODY>>>'

const SUPERVISOR_BLOCK = `監修者
株式会社日本提携支援 代表取締役
大野 駿介
過去1,000件超のM&A相談、50件超のアドバイザリー契約、15組超のM&A成約組数を担当。(株)日本M&Aセンターにて、年間最多アドバイザリー契約受賞経験あり。新規提携先の開拓やマネジメント経験を経て、(株)日本提携支援を設立。`

const FOOTER = `導入事例はこちらから
https://nihon-teikei.co.jp/news/casestudy/`

const INTRO_OPENING_PATTERNS = [
  '経営者が直面する「具体的な悩みの場面」から始める',
  '読者への問いかけ（疑問形）から始める',
  '現場で実際に起きた失敗パターンの要約から始める',
  '将来不安（後継者・資金・人材）を短く描写して始める',
  '意思決定の難しさ（売るか残すか）を提示して始める',
  '時間軸（3年後・5年後）を示した課題提起から始める',
  'NTSの相談現場で多い相談内容を導入に置いて始める',
  'よくある誤解を先に示してから本題に入る',
] as const

export interface RefinedArticle {
  refinedTitle: string
  refinedContent: string
}

export interface FirstDraftResult {
  title: string
  content: string
}

/** 一次執筆・推敲本文から監修者テキストブロックを除去する */
function stripSupervisorText(content: string): string {
  if (!content) return content
  return content
    // 「監修者：株式会社日本提携支援 代表取締役 大野 駿介」の行
    .replace(/.*監修者：株式会社日本提携支援 代表取締役 大野 駿介.*\n?/g, '')
    // 「実績：過去1,000件超のM&A相談...」の行（M&A / M&amp;A の両方）
    .replace(/.*実績：過去1,000件超のM(&amp;|&)A相談、50件超のアドバイザリー契約、15組超のM(&amp;|&)A成約組数を担当。.*\n?/g, '')
    // 「(株)日本M&Aセンターにて、年間最多アドバイザリー契約受賞経験あり。」の行（M&A / M&amp;A の両方）
    .replace(/.*\(株\)日本M(&amp;|&)Aセンターにて、年間最多アドバイザリー契約受賞経験あり。.*\n?/g, '')
    // 余分な空行を1行に圧縮
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function pickRandomIntroOpeningPattern(): string {
  const index = Math.floor(Math.random() * INTRO_OPENING_PATTERNS.length)
  return INTRO_OPENING_PATTERNS[index] ?? INTRO_OPENING_PATTERNS[0]
}

/** PREPラベル（P/R/E/P）を本文先頭ラベルから除去する（表示崩れ防止の安全策） */
function stripPrepLabels(content: string): string {
  if (!content) return content
  return content
    .replace(
      /^\s*(?:・\s*)?(?:\*\*)?\s*[PRE]\s*[（(][^）)]+[）)]\s*[：:]\s*/gm,
      ''
    )
    .replace(
      /^\s*(?:・\s*)?(?:\*\*)?\s*P\s*[（(]\s*まとめ\s*[）)]\s*[：:]\s*/gm,
      ''
    )
}

/** 画像バナー配置のプレースホルダー指示を除去する */
function stripBannerPlaceholders(content: string): string {
  if (!content) return content
  return content.replace(/\[ここに[^\]]*画像バナーを配置\]/g, '').replace(/\n{3,}/g, '\n\n')
}

/** プロンプトと参照データから一次執筆（タイトル＋本文）を生成する */
export async function generateFirstDraftFromPrompt(
  userPrompt: string,
  targetKeyword?: string,
  dataContext?: string
): Promise<FirstDraftResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません')
  const introOpeningPattern = pickRandomIntroOpeningPattern()

  const prompt = `あなたは株式会社日本提携支援（NTS）専属の上級コンテンツストラテジストです。
以下の【参照資料】を徹底的に読み込み、NTSにしか書けない記事を執筆してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【NTS固定情報】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
・監修者・実績のテキストは本文に含めないでください。投稿時に画像ブロックで表示されます。
・末尾CTA：導入事例はこちらから https://nihon-teikei.co.jp/news/casestudy/
・「[ここに〜画像バナーを配置]」のようなプレースホルダー指示は絶対に出力しないこと。画像バナーの配置はシステム側で自動処理される。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【出力形式】※必ずこの形式を守ること
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
タイトル：（記事タイトル）
---
（本文）

※「---」の下には記事本文のみを記述してください。タイトル・監修者ブロックのテキストは含めないでください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【執筆テーマ・指示】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${userPrompt}

${targetKeyword?.trim() ? `ターゲットキーワード：${targetKeyword}\n※タイトルと本文の自然な箇所に必ず盛り込むこと。` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【参照資料】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${dataContext?.trim() ? `
以下の資料を読み込んだ上で、下記の【資料活用ルール】に従って執筆すること。

${dataContext}
` : '（資料なし：プロンプトのみで執筆）'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【資料活用ルール】※資料がある場合は必ず全て実行すること
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ Ahrefsデータがある場合の使い方
1. 競合記事が上位表示されているキーワードと検索意図を把握する
2. 競合記事が薄い・触れていない論点を特定する
3. その論点をNTS記事の差別化ポイントとして見出しに使う
4. 競合より詳しく・具体的に書く（文字数・事例数・具体性で上回る）
5. 競合が使っていない切り口・角度から題材にアプローチする

■ NTS社内資料（事例・相談記録・ノウハウ等）がある場合の使い方
1. 資料中の具体的な数値・金額・期間・業種を本文中に積極的に使う
2. 「〜というケースがありました」という形で実際の事例を本文に組み込む
3. 「NTSでは〜」「大野が現場で感じるのは〜」という一人称の知見として書く
4. 一般論を述べた後、必ずNTSの現場視点でその一般論を補強または修正する
5. 資料にある数値は出典明記不要でそのまま使用してよい

■ 両方ある場合
Ahrefsで競合の弱点を特定 → NTS社内資料でその弱点を埋める
という構造で記事全体を設計する

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【執筆の絶対ルール】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❶ 冒頭は読者の悩みから始める
「近年〜」「〜が問題となっています」という書き出しは禁止。
50〜70代の中小企業経営者が「これは自分のことだ」と感じる
具体的な状況描写・悩みの言語化から入ること。
例：「後継者が見つからないまま、気がつけば自分も65歳を超えていた。」
   「売上は安定しているのに、10年後の会社の姿が描けない。」
今回の冒頭パターン指定：${introOpeningPattern}

❷ NTSの実績を本文の根拠として使う
「地方自治体との連携協定実績」「600件以上の相談実績」等の数値を
抽象的な説明の裏付けとして本文中で活用すること。
「NTSでは〜」という形で必ず2〜3箇所登場させること。

❸ 一般論で終わらせない
各見出しセクションで「一般的には〜」で終わる説明の後に、
必ず「NTSの現場では〜」「実際の事例では〜」という
具体・固有の情報を続けること。

❹ PREP法で各セクションを構成する
P（結論）→ R（理由）→ E（NTS事例・具体例）→ P（まとめ）
の順で書くこと。特にE（事例）を省略しないこと。
ただし本文中に「P（結論）」「R（理由）」「E（NTS事例・具体例）」「P（まとめ）」などのラベルは出力しないこと。

❺ 末尾は必ずCTAで締める
- まとめセクションの末尾には必ず以下の文章をそのまま使うこと（一字一句変更しないこと）：
「NTSは、M&Aを真の「提携支援」と位置付け、地方自治体との連携協定実績や600件以上の相談実績を通じて培ってきたノウハウで、中小企業の経営者の皆様のM&Aを力強くサポートいたします。M&Aについてご不明な点や不安なことがあれば、どんな些細なことでも構いません。ぜひ一度、NTSにご相談ください。」
- その後に「導入事例はこちらから https://nihon-teikei.co.jp/news/casestudy/」を必ず含めること。
- さらにその下に「待っているだけでオファーが届くM&Aオファーはこちら https://nihon-teikei.com/ma-offer」を必ず含めること。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【構成・文体ルール】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 本文は2500文字以上（資料が豊富な場合は3000文字以上を目指す）
- 見出しは「1. 」「2. 」番号付き形式、小見出しは「1-1.」形式
- 専門用語には初出時に括弧で解説（例：デューデリジェンス（DD：企業調査））
- マークダウン記法（##・**等）は使用しない
- 箇条書きは多用しない。文章で表現できるものは文章にする
- 文末表現のバリエーションを意識する（〜です・〜ますの繰り返しを避ける）
- 対象読者：50〜70代の中小企業経営者（難解な金融用語は必ず解説付き）

- 記事の末尾に「よくある質問（FAQ）」セクションを含めること。Q. と A. の形式で5つ程度の質問と回答を作成すること。質問はターゲットキーワードに関連するユーザーの疑問を反映したものにすること。`.trim()

  const raw = await generateContentWithFallback(apiKey, prompt)

  // **太字** は維持。斜体(*単一*)と # 見出しのみ除去
  let text = raw
    .replace(/\*\*(.+?)\*\*/g, '%%BOLD_START%%$1%%BOLD_END%%')
  text = text
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
  text = text
    .replace(/%%BOLD_START%%/g, '**')
    .replace(/%%BOLD_END%%/g, '**')

  const titleMatch = text.match(/タイトル：(.+)/)
  const separatorIndex = text.indexOf('---')

  if (!titleMatch && separatorIndex === -1) {
    throw new Error('生成結果の形式が不正です。再度お試しください。')
  }

  const title = titleMatch?.[1]?.trim() || '（タイトルなし）'
  let content = separatorIndex >= 0
    ? text.slice(separatorIndex + 3).trim().replace(/^-\s*/, '')
    : text.replace(/タイトル：.+/, '').trim()

  // 本文の先頭にタイトルが残っていれば削除
  content = content.replace(/^タイトル：[^\n]+\n+/, '').trim()
  if (title !== '（タイトルなし）' && content.startsWith(title)) {
    content = content.substring(title.length).trim()
  }
  content = stripPrepLabels(content)
  content = stripBannerPlaceholders(content)

  return {
    title: title || '（タイトルなし）',
    content: content || '',
  }
}

export async function refineArticleWithGemini(
  title: string,
  content: string,
  targetKeyword?: string
): Promise<RefinedArticle> {
  // 元記事から監修者テキストを事前に除去
  const cleanedContent = stripSupervisorText(content)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません')

  const prompt = `あなたは株式会社日本提携支援（NTS）の編集長です。
以下の記事を精査・推敲してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【NTS固定情報：推敲後も必ず維持すること】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
・監修者・実績のテキストは本文に含めないでください。投稿時に画像ブロックで表示されます。
・末尾CTA：導入事例はこちらから https://nihon-teikei.co.jp/news/casestudy/
  待っているだけでオファーが届くM&Aオファーはこちら https://nihon-teikei.com/ma-offer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【元記事】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
タイトル：${title}

本文：
${cleanedContent}

${targetKeyword?.trim() ? `ターゲットキーワード：${targetKeyword}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【推敲チェックリスト：上から順に確認・修正すること】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【A. タイトル】
□ ターゲットキーワードが自然に含まれているか
□ 数字・具体性が入っているか（「5つの」「失敗しない」等）
□ 32文字以内か
□ クリックしたくなる表現になっているか

【B. 冒頭】
□ 「近年〜」「〜が問題となっています」で始まっていないか
  → もし始まっていたら「読者の悩みの言語化」に書き直す
□ 50〜70代経営者が「自分のことだ」と感じる描写になっているか

【C. NTSの独自性】
□ 「NTSでは〜」という固有の視点・事例が2〜3箇所あるか
  → なければ追加する
□ NTSの実績数値（1,000件・50件・15組）が本文中で使われているか
  → なければ適切な箇所に挿入する
□ 一般論だけで終わっているセクションがないか
  → あれば「NTSの現場では〜」で補強する

【D. 構成・文体】
□ 冗長な表現・繰り返しを削除する
□ 文末表現のバリエーションを増やす（〜です・〜ますの連続を避ける）
□ 専門用語の解説が抜けていれば追加する
□ アスタリスク（*）は一切使用禁止。箇条書きは必ず「・」を使うこと（* で始める箇条書きは不可。出力に * が1つも含まれないようにすること）
□ PREPで整理する際も「P（結論）」「R（理由）」「E（事例）」「P（まとめ）」などのラベル文字は本文に出力しないこと
□ 「[ここに〜画像バナーを配置]」のようなプレースホルダー指示は絶対に出力しないこと。画像バナーの配置はシステム側で自動処理されるため、本文に含めてはならない。

【E. 末尾CTA】
□ NTSへの相談を促す自然な文章があるか
□ 「導入事例はこちらから https://nihon-teikei.co.jp/news/casestudy/」で締めているか
  → なければ追加する
□ その下に「待っているだけでオファーが届くM&Aオファーはこちら https://nihon-teikei.com/ma-offer」を追加しているか
  → なければ追加する

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【出力形式】※必ずこの形式を守ること
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
タイトル：（推敲後タイトル）
---
（推敲後本文）

※「---」の下には推敲後本文のみを記述してください。タイトル・監修者ブロックのテキストは含めないでください。`.trim()

  let text = await generateContentWithFallback(apiKey, prompt)
  // **太字** は維持。斜体(*単一*)と箇条書きの * のみ ・ に変換
  // 1) まず **太字** を一時プレースホルダに退避
  text = text.replace(/\*\*(.+?)\*\*/g, '%%BOLD_START%%$1%%BOLD_END%%')
  // 2) 残った * を処理（斜体・箇条書き）
  text = text
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^\s*\*\s+/gm, '・ ')
    .replace(/\*\s+/g, '・ ')
    .replace(/\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
  // 3) **太字** を復元
  text = text
    .replace(/%%BOLD_START%%/g, '**')
    .replace(/%%BOLD_END%%/g, '**')

  const titleMatch = text.match(/タイトル：(.+)/)
  const separatorIndex = text.indexOf('---')

  if (!titleMatch && separatorIndex === -1) {
    throw new Error('推敲結果の形式が不正です。再度お試しください。')
  }

  const refinedTitle = titleMatch?.[1]?.trim() || title
  let refinedContent = separatorIndex >= 0
    ? text.slice(separatorIndex + 3).trim().replace(/^-\s*/, '')
    : text.replace(/タイトル：.+/, '').trim()

  // 本文の先頭にタイトルが残っていれば削除
  refinedContent = refinedContent.replace(/^タイトル：[^\n]+\n+/, '').trim()
  if (refinedTitle && refinedContent.startsWith(refinedTitle)) {
    refinedContent = refinedContent.substring(refinedTitle.length).trim()
  }

  // 念のため推敲後本文からも監修者テキストを除去
  refinedContent = stripSupervisorText(refinedContent)
  refinedContent = stripPrepLabels(refinedContent)
  refinedContent = stripBannerPlaceholders(refinedContent)

  return {
    refinedTitle: refinedTitle || title,
    refinedContent: refinedContent || content,
  }
}

/** 記事タイトル・キーワードからSEO向け英語スラッグを生成する */
export async function generateSlugFromGemini(
  title: string,
  targetKeyword?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey?.trim()) return fallbackSlug()

  const kwPart = targetKeyword?.trim() ? `\nTarget keyword: ${targetKeyword.trim()}` : ''
  const prompt = `You are an SEO specialist. Given the following Japanese article title, generate exactly ONE URL slug in ENGLISH.

CRITICAL: You MUST respond in English only. NEVER use Japanese characters. Output ONLY the slug string, nothing else.

RULES:
- Use ONLY lowercase English letters (a-z), numbers (0-9), and hyphens (-)
- 3 to 5 words separated by hyphens
- Reflect the specific topic of the article
- Do NOT use Japanese, Chinese, or any non-ASCII characters

EXAMPLES:
- "M&Aアドバイザーの選び方" → ma-advisor-selection-guide
- "事業承継の基礎知識" → business-succession-basics
- "デューデリジェンスの進め方" → due-diligence-process-guide
- "中小企業M&Aの成功ポイント" → sme-ma-success-tips

Title: ${title.trim()}${kwPart}

Slug:`

  try {
    const raw = await generateContentWithFallback(apiKey, prompt)
    const sanitized = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
    return sanitized.length >= 3 ? sanitized : fallbackSlug()
  } catch (e) {
    console.warn('Gemini slug generation failed:', (e as Error)?.message)
    return fallbackSlug()
  }
}

function fallbackSlug(): string {
  const d = new Date()
  return `article-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

/** 記事タイトル・本文から画像生成用の英文プロンプトを1文で生成する（Stable Diffusion用） */
export async function generateImagePromptFromArticle(
  title: string,
  content: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey?.trim()) throw new Error('GEMINI_API_KEY が設定されていません')

  const contentSnippet = content.trim().slice(0, 1800)
  const prompt = `You are an expert at writing image generation prompts for professional Japanese business article thumbnails. Style: Adobe Stock–like corporate / M&A imagery — clean, trustworthy, varied compositions.

Given the TITLE and CONTENT (Japanese) below, output exactly ONE English sentence for a photorealistic 16:9 horizontal stock photo.

STEP 1 — Pick EXACTLY ONE archetype at random (use genuine randomness; do not default to the first). Match the article mood when obvious, but still vary across requests.

ARCHETYPES:
1) Overhead flat-lay: white desk, business documents, laptop with abstract colorful charts only (no legible text), pen, coffee cup, optional two plain solid wooden cubes with NO letters or carving, no people.
2) Overhead flat-lay: merger-related papers, corporate stamp, pen, reading glasses, minimal desk, no people.
3) Overhead: financial printouts and abstract bar charts, calculator, pen, clean white table, no people, no readable numbers on paper.
4) White desk workspace: open laptop with abstract dashboard graphics, scattered documents, shallow depth of field, no people.
5) Two professionals in suits at bright white desk, open binder with charts, tablet, hands reviewing materials in focus, faces soft blur or cropped out of frame, no camera-facing portrait.
6) Side angle business meeting: colleagues over documents and tablet, emphasis on desk surface and charts, faces not dominant, bright modern office.
7) Dramatic low-angle worm-eye view of glass skyscrapers converging upward, cool blue-grey steel and glass, some warm window lights, financial district, no street people.
8) Modern collaboration: light wooden desk, hands gesturing mid-conversation, laptop with abstract UI blocks, notebook and phone, strong bokeh background, casual business attire, second person blurred.
9) Conference table wide shot: team from behind or silhouettes, laptops and papers, integration or strategy feel, no clear facial close-ups.
10) Succession or legacy mood: wooden desk, leather notebook, pen, family-business documents flat-lay, warm light, no people.
11) Contract / legal mood: neat stack of agreements, fountain pen, white surface, no people, no readable clauses.
12) Default corporate: clean Japanese office desk with documents and laptop, abstract screen graphics, navy white grey palette, no people.

GLOBAL RULES (mandatory):
- Never ask for letters, numbers, logos, watermarks, subtitles, or readable text. Charts and screens must be abstract / illegible only.
- Never describe letter blocks, engraved M or A, ampersand on cubes, or spelling words with blocks. Plain unmarked wooden cubes only if any cubes appear.
- People allowed ONLY in archetypes 5–6 and 8–9. Then: no selfie, no glamor portrait; hands and materials in focus; faces partial or softly blurred.
- Photorealistic, professional lighting, navy/grey/white friendly palette unless skyscraper night cool tones.

OUTPUT: One English sentence only, max 45 words, no quotation marks, no explanation.

TITLE:
${title.trim()}

CONTENT (excerpt):
${contentSnippet}

Your single English sentence:`

  const raw = await generateContentWithFallback(apiKey, prompt)
  const sentence = raw.trim().replace(/^["']|["']$/g, '').trim()
  return (
    sentence ||
    'overhead flat-lay of business documents and laptop with abstract charts on white desk, plain unmarked wooden cubes optional, photorealistic corporate stock photo, 16:9'
  )
}
