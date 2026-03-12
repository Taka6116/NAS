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

export interface RefinedArticle {
  refinedTitle: string
  refinedContent: string
}

export interface FirstDraftResult {
  title: string
  content: string
}

/** プロンプトと参照データから一次執筆（タイトル＋本文）を生成する */
export async function generateFirstDraftFromPrompt(
  userPrompt: string,
  targetKeyword?: string,
  dataContext?: string
): Promise<FirstDraftResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません')

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

❷ NTSの実績を本文の根拠として使う
「1,000件超の相談実績」「15組超の成約実績」等の数値を
抽象的な説明の裏付けとして本文中で活用すること。
「NTSでは〜」という形で必ず2〜3箇所登場させること。

❸ 一般論で終わらせない
各見出しセクションで「一般的には〜」で終わる説明の後に、
必ず「NTSの現場では〜」「実際の事例では〜」という
具体・固有の情報を続けること。

❹ PREP法で各セクションを構成する
P（結論）→ R（理由）→ E（NTS事例・具体例）→ P（まとめ）
の順で書くこと。特にE（事例）を省略しないこと。

❺ 末尾は必ずCTAで締める
- NTSへの相談を促す自然な文章（押し売り感なく）
- 「導入事例はこちらから https://nihon-teikei.co.jp/news/casestudy/」
この2点を必ず含めること。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【構成・文体ルール】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 本文は2500文字以上（資料が豊富な場合は3000文字以上を目指す）
- 見出しは「1. 」「2. 」番号付き形式、小見出しは「1-1.」形式
- 専門用語には初出時に括弧で解説（例：デューデリジェンス（DD：企業調査））
- マークダウン記法（##・**等）は使用しない
- 箇条書きは多用しない。文章で表現できるものは文章にする
- 文末表現のバリエーションを意識する（〜です・〜ますの繰り返しを避ける）
- 対象読者：50〜70代の中小企業経営者（難解な金融用語は必ず解説付き）`.trim()

  const raw = await generateContentWithFallback(apiKey, prompt)

  const text = raw
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')

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

  // 監修者ブロックが本文の先頭になければ強制的に追加
  const SUPERVISOR_BLOCK = `監修者：株式会社日本提携支援 代表取締役 大野 駿介\n実績：過去1,000件超のM&A相談、50件超のアドバイザリー契約、15組超のM&A成約組数を担当。\n      (株)日本M&Aセンターにて、年間最多アドバイザリー契約受賞経験あり。`
  if (!content.includes('監修者：株式会社日本提携支援 代表取締役 大野 駿介')) {
    content = `${SUPERVISOR_BLOCK}\n\n${content}`
  } else if (!content.startsWith('監修者：')) {
    // 含まれているが先頭ではない場合、一旦削除して先頭に追加する
    const blockRegex = /監修者：株式会社日本提携支援 代表取締役 大野 駿介[\s\S]*?(?:受賞経験あり。|設立。)/
    content = content.replace(blockRegex, '').trim()
    content = `${SUPERVISOR_BLOCK}\n\n${content}`
  }

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
${content}

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
  // 太字・斜体を除去したうえで、* は一切残さず ・ に統一（箇条書きは必ず ・）
  text = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^\s*\*\s+/gm, '・ ')
    .replace(/\*\s+/g, '・ ')
    .replace(/\*/g, '・')
    .replace(/^#{1,6}\s+/gm, '')

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

  // 監修者ブロックが本文の先頭になければ強制的に追加
  const SUPERVISOR_BLOCK = `監修者：株式会社日本提携支援 代表取締役 大野 駿介\n実績：過去1,000件超のM&A相談、50件超のアドバイザリー契約、15組超のM&A成約組数を担当。\n      (株)日本M&Aセンターにて、年間最多アドバイザリー契約受賞経験あり。`
  if (!refinedContent.includes('監修者：株式会社日本提携支援 代表取締役 大野 駿介')) {
    refinedContent = `${SUPERVISOR_BLOCK}\n\n${refinedContent}`
  } else if (!refinedContent.startsWith('監修者：')) {
    // 含まれているが先頭ではない場合、一旦削除して先頭に追加する
    const blockRegex = /監修者：株式会社日本提携支援 代表取締役 大野 駿介[\s\S]*?(?:受賞経験あり。|設立。)/
    refinedContent = refinedContent.replace(blockRegex, '').trim()
    refinedContent = `${SUPERVISOR_BLOCK}\n\n${refinedContent}`
  }

  return {
    refinedTitle: refinedTitle || title,
    refinedContent: refinedContent || content,
  }
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
- Option A (handshake): professional handshake between business people in dark suits (navy, grey), clean white or very light grey minimalist background, symbolic of deal or partnership. Upper bodies or hands and suit sleeves visible.
- Option B (flat-lay): overhead flat-lay of M&A-themed objects on white — wooden or cardboard blocks spelling "M" "&" "A", business documents, laptop, calculator, pen, spread on clean white desk; no people in frame.
- Option C (stacked blocks): wooden blocks stacked vertically with "M" "&" "A" on each, placed on business documents or reports with graphs and charts, clean light grey or white background, shallow depth of field, professional stock photography.
- Option D (conceptual hand): businessman hand in dark suit sleeve, palm or hand over business documents and charts, symbolic of M&A or deal-making, professional conceptual corporate photography, clean or soft neutral background, no face visible.
- Option E (meeting hands): close-up of business meeting table with multiple hands holding tablet, documents, pen, calculator; collaborative discussion, no faces visible, clean white table, natural light, professional corporate stock photography.
- Option F: two or three business professionals in formal suits, mid-shot, clean uncluttered background, positive professional mood, like high-end stock photography.
- Avoid: busy conference rooms with many people, cluttered desks, windows with city views, casual or generic office meetings.
- For non-M&A topics: overhead flat-lay of documents/contracts, or hands with documents/charts, or simple office desk with laptop/documents; same clean, minimal background.

RULES:
- Clean, minimal background (white, light grey, or soft neutral). No text, no watermark, no typography in the image.
- Photorealistic, professional, navy/grey/white color palette, soft even lighting, 16:9 horizontal.
- For M&A articles, choose from options A through F so that handshake, flat-lay, stacked blocks, conceptual hand, meeting hands, and group shot are all used over time — do not always pick the same option.

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
