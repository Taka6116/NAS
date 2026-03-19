import { GoogleGenerativeAI } from '@google/generative-ai'

/** 429/クォータ超過時に順に試すモデル（モデルごとに別枠のことがある） */
const GEMINI_MODELS = ['gemini-2.5-flash'] as const

/**
 * 指定プロンプトで generateContent を実行し、429 の場合は別モデルでリトライする
 */
async function generateContentWithFallback(apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  let lastError: Error | null = null
  for (const modelId of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelId })
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      const msg = lastError.message
      const isQuota = /429|quota|Too Many Requests/i.test(msg)
      if (isQuota) continue
      throw lastError
    }
  }
  throw new Error(
    '無料枠のリクエスト上限に達しました。しばらく時間をおくか、Google AI Studio で課金を有効にしてください。'
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
  const prompt = `You are an SEO specialist. Given the following Japanese article title, generate exactly ONE URL slug in English.

RULES:
- Use lowercase letters, numbers, and hyphens only
- 3 to 5 words separated by hyphens (e.g. "ma-advisor-guide", "business-succession-tips")
- Reflect the specific topic of the article, not generic words
- Do NOT use Japanese characters
- Output ONLY the slug, nothing else

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
  const prompt = `You are an expert at writing image generation prompts for professional Japanese business article thumbnails. The target style is Adobe Stock–like M&A / corporate imagery: clean, symbolic, trustworthy.

Given the following article TITLE and CONTENT (in Japanese), output exactly ONE short sentence in English describing a photorealistic business image.

STYLE REFERENCE (M&A / corporate articles) — choose ONE of these; vary across articles so different patterns appear:
- Option A (flat-lay): overhead flat-lay of M&A-themed objects on white — wooden or cardboard blocks spelling "M" "&" "A", business documents, laptop, calculator, pen, spread on clean white desk; no people in frame.
- Option B (stacked blocks): wooden blocks stacked vertically with "M" "&" "A" on each, placed on business documents or reports with graphs and charts, clean light grey or white background, shallow depth of field, professional stock photography, no people.
- Option C (documents): overhead flat-lay of merger agreement documents, corporate stamps, pen and glasses on clean white desk, professional stock photography, no people.
- Option D (workspace): overhead view of a clean white desk with business documents, laptop showing charts, coffee cup and pen, professional M&A advisory workspace, corporate stock photography, no people.
- Option E (letter blocks): wooden letter blocks M and A with ampersand on top of financial reports and bar charts, soft natural light, clean white background, professional corporate photography, no people.
- Option F (miniature): two miniature wooden building blocks side by side on business documents symbolizing corporate merger, clean light background, shallow depth of field, professional stock photography, no people.
- Avoid: busy conference rooms, cluttered desks, windows with city views, casual or generic office meetings.
- For non-M&A topics: overhead flat-lay of documents/contracts, or simple office desk with laptop/documents; same clean, minimal background. No people.

RULES:
- CRITICAL: Do NOT include human hands, fingers, or any body parts in the image description. Prefer object-only compositions (flat-lay, blocks, documents, desk items).
- Clean, minimal background (white, light grey, or soft neutral). No text, no watermark, no typography in the image.
- Photorealistic, professional, navy/grey/white color palette, soft even lighting, 16:9 horizontal.
- For M&A articles, choose from options A through F so that flat-lay, stacked blocks, documents, workspace, letter blocks, and miniature are all used over time — do not always pick the same option.

OUTPUT: ONE English sentence only. No explanation. No quotes. Under 30 words.

TITLE:
${title.trim()}

CONTENT (excerpt):
${contentSnippet}

Your single English sentence:`

  const raw = await generateContentWithFallback(apiKey, prompt)
  const sentence = raw.trim().replace(/^["']|["']$/g, '').trim()
  return sentence || 'professional Japanese business environment, modern office, photorealistic, 16:9'
}
