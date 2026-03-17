export interface WordPressPostPayload {
  title: string;
  content: string;          // 推敲済み本文（プレーンテキスト）
  targetKeyword?: string;
  imageUrl?: string;        // アイキャッチ画像URL (互換性維持のため残す)
  imageBase64?: string;     // Base64形式の画像データ
  imageBase64MimeType?: string; // 例：'image/png'
  category?: string;        // カテゴリ名（任意）
  slug?: string;            // URLスラッグ（任意・空の場合はWPが自動生成）
}

export interface WordPressPostResult {
  id: number;
  link: string;             // 投稿のURL
  editLink: string;         // 管理画面の編集URL
  status: 'draft' | 'publish';
}

import { getSupervisorBlockHtml } from './supervisorBlock'

/** 監修者画像のデフォルト（WordPressメディアライブラリ・左の丸画像用） */
const DEFAULT_SUPERVISOR_IMAGE_URL = 'https://nihon-teikei.co.jp/wp-content/uploads/2026/03/3159097ae625791c1a400e6900330153.png'

/** 旧S3の監修者画像URL（このURLの場合はWordPressのURLに差し替える） */
const LEGACY_S3_SUPERVISOR_PATTERN = /data-for-nas\.s3\.ap-northeast-1\.amazonaws\.com\/pictures\//i

/** URLが http:// の場合は https:// に変換（Mixed Content 防止） */
function forceHttps(url: string): string {
  if (url && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

/**
 * 監修者画像（大野 駿介さん）のURLを実行時に取得。
 * 左の丸画像は必ずWordPressメディアライブラリのお顔画像を使用。
 * 優先: WORDPRESS_SUPERVISOR_IMAGE_URL > デフォルト（お顔画像URL）。S3/CloudFrontは使わない。
 * 返却URLは必ず https に統一（Mixed Content 防止）。
 */
export function getSupervisorImageUrl(): string {
  const wp = process.env.WORDPRESS_SUPERVISOR_IMAGE_URL?.trim();
  if (wp) return forceHttps(wp);
  const direct = process.env.SUPERVISOR_IMAGE_URL?.trim();
  if (direct && !LEGACY_S3_SUPERVISOR_PATTERN.test(direct)) return forceHttps(direct);
  return DEFAULT_SUPERVISOR_IMAGE_URL;
}

/** WordPress投稿本文用の監修者画像URL。メディアライブラリのURLを優先（下書きで表示される）。必ず https。 */
export function getSupervisorImageUrlForWordPress(): string {
  const wpUrl = process.env.WORDPRESS_SUPERVISOR_IMAGE_URL?.trim();
  if (wpUrl) return forceHttps(wpUrl);
  return getSupervisorImageUrl();
}

/**
 * WordPress投稿用のCTAバナー画像URLを取得
 * 環境変数 NEXT_PUBLIC_CLOUDFRONT_URL があればCloudFront経由、なければS3直接URLを返す
 */
function getCtaBannerImageUrl(): string {
  const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL?.trim();
  if (cloudFrontUrl) {
    return `${cloudFrontUrl}/data-for-nas/pictures/NTS+CTA+%E9%9B%BB%E8%A9%B1%E7%95%AA%E5%8F%B7%E4%BB%98%E3%81%8D.png`;
  }
  return 'https://data-for-nas.s3.ap-northeast-1.amazonaws.com/pictures/NTS+CTA+%E9%9B%BB%E8%A9%B1%E7%95%AA%E5%8F%B7%E4%BB%98%E3%81%8D.png';
}

/**
 * CTAバナーのHTMLブロックを生成
 * クリックで https://nihon-teikei.co.jp/contact/ に遷移する
 */
function buildCtaBannerHtml(): string {
  const imageUrl = getCtaBannerImageUrl();
  return `<div style="text-align:center;margin:40px 0;padding:0;">
  <a href="https://nihon-teikei.co.jp/contact/" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;">
    <img src="${imageUrl}" alt="M&Aの専門家に無料で相談してみる - 03-6455-2940（10:00〜20:00 年中無休）" style="max-width:100%;width:700px;height:auto;border:none;border-radius:8px;" loading="lazy" />
  </a>
</div>`;
}

/**
 * 記事本文HTMLの「中盤」にCTAバナーを挿入する
 *
 * ロジック:
 * 1. htmlBody 内のすべての <h2 タグの出現位置を取得
 * 2. h2 が3個以上 → 中間のh2の直前に挿入
 * 3. h2 が2個 → 2番目のh2の直前に挿入
 * 4. h2 が1個以下 → 段落(<p>)の中間地点付近の直後に挿入（フォールバック）
 *
 * @param htmlBody convertToHtml + linkifyCtaUrls 適用済みの本文HTML
 * @returns CTAバナーが挿入された本文HTML
 */
function insertCtaBannerIntoBody(htmlBody: string): string {
  const ctaBannerHtml = buildCtaBannerHtml();

  // h2タグの出現位置をすべて取得
  const h2Regex = /<h2[\s>]/gi;
  const h2Positions: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = h2Regex.exec(htmlBody)) !== null) {
    h2Positions.push(match.index);
  }

  if (h2Positions.length >= 3) {
    // h2が3個以上 → 中間のh2直前に挿入
    const midIndex = Math.floor(h2Positions.length / 2);
    const insertPos = h2Positions[midIndex]!;
    return htmlBody.slice(0, insertPos) + ctaBannerHtml + '\n' + htmlBody.slice(insertPos);
  } else if (h2Positions.length === 2) {
    // h2が2個 → 2番目のh2直前に挿入
    const insertPos = h2Positions[1]!;
    return htmlBody.slice(0, insertPos) + ctaBannerHtml + '\n' + htmlBody.slice(insertPos);
  }

  // h2が1個以下の場合は <p> の終端(</p>)を使って本文の中間あたりを探す
  const pEndRegex = /<\/p>/gi;
  const pEndPositions: number[] = [];
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pEndRegex.exec(htmlBody)) !== null) {
    // </p> の直後に挿入したいので、タグの末尾位置を記録
    pEndPositions.push(pMatch.index + pMatch[0].length);
  }

  if (pEndPositions.length >= 2) {
    const midIndex = Math.floor(pEndPositions.length / 2);
    const insertPos = pEndPositions[midIndex]!;
    return (
      htmlBody.slice(0, insertPos) +
      '\n' +
      ctaBannerHtml +
      '\n' +
      htmlBody.slice(insertPos)
    );
  }

  // フォールバック：本文末尾に追加
  return htmlBody + '\n' + ctaBannerHtml;
}

/** メディアアップロード結果（アイキャッチ設定と本文挿入用URL） */
interface WordPressMediaUploadResult {
  id: number;
  sourceUrl: string;
}

/**
 * Base64画像をWordPressメディアライブラリにアップロードしてメディアIDとURLを返す
 */
async function uploadBase64ImageToWordPress(
  base64: string,
  mimeType: string,
  credentials: string,
  wpUrl: string
): Promise<WordPressMediaUploadResult> {
  const buffer = Buffer.from(base64, 'base64');
  const ext = mimeType.split('/')[1] ?? 'png';
  const fileName = `nas-image-${Date.now()}.${ext}`;

  const res = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Type': mimeType,
    },
    body: buffer,
  });

  if (!res.ok) {
    throw new Error(`メディアアップロード失敗: ${res.status}`);
  }

  const media = await res.json();
  const rawUrl = media.source_url ?? media.link;
  return { id: media.id, sourceUrl: forceHttps(rawUrl) };
}

/**
 * インラインのマークダウン風記法をHTMLに変換（WordPress表示用）
 * - **太字** → <strong>
 * - __下線__ → <span style="text-decoration:underline;">
 * - *斜体* → <em>
 * - 既存の <strong>, <em>, <u>, <a>, <br> はそのまま通過
 */
/** プレビューとWordPressで同一表示にするための strong スタイル */
const STRONG_STYLE = 'color:#0e357f;font-weight:700;';

function applyInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, `<strong style="${STRONG_STYLE}">$1</strong>`)
    .replace(/__(.+?)__/g, '<span style="text-decoration:underline;">$1</span>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
}

/** リスト行「・ラベル: 説明」のラベル部分を太字に */
function emphasizeListLabel(line: string): string {
  const match = line.match(/^([・\s]*)([^：:]+)([：:])\s*(.*)$/);
  if (match) {
    const [, bullet, label, colon, rest] = match;
    return `${bullet}<strong style="${STRONG_STYLE}">${label.trim()}</strong>${colon} ${rest}`;
  }
  return applyInlineFormatting(line);
}

/** プレビューと同一の見出し・本文スタイル（WordPress本文で使用） */
const H2_STYLE = "font-size:22px;font-weight:900;margin:48px 0 16px;padding-bottom:8px;border-bottom:3px solid #0e357f;font-family:'Noto Sans JP',sans-serif;";
const H3_STYLE = 'font-size:18px;font-weight:700;margin:32px 0 12px;color:#111;';
const P_STYLE = 'margin-bottom:1.6em;';

/**
 * プレーンテキストの本文をHTMLに変換する
 * - 見出しは太字・色 #1e3a8a
 * - **テキスト** → <strong>、__テキスト__ → 下線
 * - 「・ラベル: 説明」のラベルを太字に
 */
export function convertToHtml(content: string): string {
  const lines = content.split('\n');
  const htmlLines: string[] = [];
  let currentParagraph: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const raw = currentParagraph.join('<br>').trim();
      if (raw) {
        const text = raw
          .split('<br>')
          .map(emphasizeListLabel)
          .join('<br>');

        // 既にブロック要素(<p>, <h2> など)で始まっている場合は二重に <p> で囲まない
        const isBlockElement = /^<(p|h[1-6]|div|ul|ol|li|table|script|!--)/i.test(text.trim());
        if (isBlockElement) {
          htmlLines.push(text);
        } else {
          htmlLines.push(`<p style="${P_STYLE}">${text}</p>`);
        }
      }
      currentParagraph = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^\d+[．.]\s/.test(trimmed)) {
      flushParagraph();
      const text = trimmed.replace(/^\d+[．.]\s*/, '');
      htmlLines.push(`<h2 style="${H2_STYLE}">${applyInlineFormatting(text)}</h2>`);
      continue;
    }

    if (/^\d+-\d+[．.]\s/.test(trimmed)) {
      flushParagraph();
      const text = trimmed.replace(/^\d+-\d+[．.]\s*/, '');
      htmlLines.push(`<h3 style="${H3_STYLE}">${applyInlineFormatting(text)}</h3>`);
      continue;
    }

    if (/^[■▶◆●▼]\s/.test(trimmed)) {
      flushParagraph();
      const text = trimmed.replace(/^[■▶◆●▼]\s*/, '');
      htmlLines.push(`<h3 style="${H3_STYLE}">${applyInlineFormatting(text)}</h3>`);
      continue;
    }

    currentParagraph.push(trimmed);
  }

  flushParagraph();
  return htmlLines.join('\n');
}

/** HTMLタグ除去と主要なHTMLエンティティのデコード（Schema用プレーンテキスト化） */
function stripHtmlAndDecodeEntities(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 本文からFAQ候補を抽出する（Q&A形式の箇所を検出）
 * 対応形式: "Q1. 質問文\n\nA. 回答文" / "Q. 質問" / "Q：質問" など
 */
function extractFaqs(content: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];

  // パターン: "Q数字. 質問" または "Q. 質問" → 改行 → "A. 回答"（次のQまたは末尾まで）
  const qaRegex = /Q\d*[.．、]\s*(.+?)[\n\r]+(?:<br\s*\/?>)*[\n\r]*A[.．、]\s*([\s\S]*?)(?=Q\d*[.．、]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = qaRegex.exec(content)) !== null) {
    const question = stripHtmlAndDecodeEntities(match[1].trim());
    const answer = stripHtmlAndDecodeEntities(match[2].trim());
    if (question.length > 0 && answer.length > 0) {
      faqs.push({ question, answer });
    }
  }

  // 上記で取れなかった場合: "Q. / Q: / Q：" と "A. / A:" のペア（数字なし）
  if (faqs.length === 0) {
    const fallbackRegex = /Q[.．：:\s]+(.+?)[\n\r]+(?:<br\s*\/?>)*[\n\r]*A[.．：:\s]+([\s\S]*?)(?=Q[.．：:\s]|$)/gs;
    while ((match = fallbackRegex.exec(content)) !== null) {
      const question = stripHtmlAndDecodeEntities(match[1].trim());
      const answer = stripHtmlAndDecodeEntities(match[2].trim());
      if (question && answer) faqs.push({ question, answer });
    }
  }

  return faqs;
}

/**
 * Article Schema（構造化データ）を生成（AIO/LLMO最適化）
 * image.url には必ず HTTPS のURLのみを使用し、data URL(base64)は入れない
 */
function buildArticleSchema(
  payload: WordPressPostPayload,
  slug: string,
  options?: { bodyTopImageUrl?: string }
): string {
  // Schema用の画像URL決定ロジック
  // 1. WordPressメディアにアップロード済みのURL（bodyTopImageUrl）があれば最優先
  // 2. payload.imageUrl が data: で始まらない通常のURLならそれを使用
  // 3. どちらも無ければ image プロパティ自体を省略
  let schemaImageUrl: string | null = null;
  if (options?.bodyTopImageUrl) {
    schemaImageUrl = options.bodyTopImageUrl;
  } else if (payload.imageUrl && !payload.imageUrl.startsWith('data:')) {
    schemaImageUrl = payload.imageUrl;
  }

  // 記事の最初の200文字程度を description として抽出（監修者・HTML・エンティティ除去）
  const withoutSupervisor = payload.content.replace(/監修者[\s\S]*?(?=\n\n)/g, '').trim();
  const plainContent = stripHtmlAndDecodeEntities(withoutSupervisor);
  const description = plainContent.substring(0, 200).trim();

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': payload.title,
    'description': description,
    'datePublished': new Date().toISOString().split('T')[0],
    'dateModified': new Date().toISOString().split('T')[0],
    'author': [
      {
        '@type': 'Person',
        'name': '大野 駿介',
        'jobTitle': '代表取締役',
        'worksFor': {
          '@type': 'Organization',
          'name': '株式会社日本提携支援',
          'url': 'https://nihon-teikei.co.jp',
        },
        'description': '過去1,000件超のM&A相談、50件超のアドバイザリー契約、15組超のM&A成約組数を担当。(株)日本M&Aセンターにて、年間最多アドバイザリー契約受賞経験あり。',
      },
    ],
    'publisher': {
      '@type': 'Organization',
      'name': '株式会社日本提携支援',
      'url': 'https://nihon-teikei.co.jp',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://nihon-teikei.co.jp/wp-content/themes/nihonteikei/assets/images/logo.png',
      },
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `https://nihon-teikei.co.jp/news/column/${slug}`,
    },
    'about': {
      '@type': 'Thing',
      'name': payload.targetKeyword || payload.title,
    },
    'keywords': payload.targetKeyword?.trim() || payload.title || '',
  };

  if (schemaImageUrl) {
    schema.image = {
      '@type': 'ImageObject',
      'url': schemaImageUrl,
    };
  }

  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

/**
 * FAQPage Schema を生成（FAQが存在する場合のみ）
 */
function buildFaqSchema(faqs: Array<{ question: string; answer: string }>): string {
  if (!faqs || faqs.length === 0) return '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer,
      },
    })),
  };

  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

/**
 * 本文先頭の「監修者：…」「実績：…」などの監修者テキストを除去する
 * （画像付き監修者ブロックを別挿入するため、テキストの二重表示を防ぐ）
 */
function stripLeadingSupervisorText(content: string): string {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i]!.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    if (/^監修者[：:]\s*/.test(trimmed) || /^実績[：:]\s*/.test(trimmed) || /^株式会社日本提携支援\s+代表/.test(trimmed) || /^\(株\)日本M&Aセンター/.test(trimmed)) {
      i++;
      continue;
    }
    break;
  }
  return lines.slice(i).join('\n').replace(/^\n+/, '');
}

/** 本文HTML内の末尾CTAをハイパーリンクに変換（WordPress投稿でクリック可能にする） */
function linkifyCtaUrls(html: string): string {
  return html
    .replace(
      /導入事例はこちらから\s+https?:\/\/nihon-teikei\.co\.jp\/news\/casestudy\/?/g,
      '<a href="https://nihon-teikei.co.jp/news/casestudy/">導入事例はこちらから</a>'
    )
    .replace(
      /待っているだけでオファーが届くM&Aオファーはこちら\s+https?:\/\/nihon-teikei\.com\/ma-offer/g,
      '<a href="https://nihon-teikei.com/ma-offer">待っているだけでオファーが届くM&Aオファーはこちら</a>'
    )
    .replace(
      /待っているだけでオファーが届くM&amp;Aオファーはこちら\s+https?:\/\/nihon-teikei\.com\/ma-offer/g,
      '<a href="https://nihon-teikei.com/ma-offer">待っているだけでオファーが届くM&amp;Aオファーはこちら</a>'
    );
}

/**
 * メインの投稿コンテンツを構築
 * 順序: 本文最上部に記事画像（アイキャッチと同じ）→ 監修者ブロック（画像付き）→ 記事本文 → Schema
 * @param bodyTopImageUrl ウェブアプリで作成した画像のURL（WordPressメディア）。本文最上部とアイキャッチに使用
 */
export function buildPostContent(
  payload: WordPressPostPayload,
  options?: { bodyTopImageUrl?: string }
): string {
  const slug = payload.slug || payload.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);

  // 0. 本文から先頭の監修者テキストを除去（画像付きブロックのみ表示するため）
  const contentWithoutSupervisorText = stripLeadingSupervisorText(payload.content);

  // 1. 本文をHTMLに変換
  let htmlBody = convertToHtml(contentWithoutSupervisorText);
  htmlBody = linkifyCtaUrls(htmlBody);

  // 1-0. CTAバナーを本文中盤に挿入
  htmlBody = insertCtaBannerIntoBody(htmlBody);

  // 1-1. 本文最上部：記事画像（プレビューと同じスタイル）
  const bodyTopImageBlock =
    options?.bodyTopImageUrl
      ? `<img src="${options.bodyTopImageUrl}" style="width:100%;height:auto;margin-bottom:32px;display:block;" alt="" />`
      : '';

  // 1-2. 監修者ブロック（プレビューと同一HTML＝supervisorBlock.tsで単一ソース化）
  const supervisorImageUrl = getSupervisorImageUrlForWordPress();
  const supervisorBlock = getSupervisorBlockHtml(supervisorImageUrl);

  const fullBody = [bodyTopImageBlock, supervisorBlock, htmlBody].filter(Boolean).join('');

  // 2. FAQを抽出
  const faqs = extractFaqs(payload.content);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[FAQ] Extracted ${faqs.length} FAQs`);
  }

  // 3. Schema生成（投稿には必ず含める）
  const articleSchema = buildArticleSchema(payload, slug, { bodyTopImageUrl: options?.bodyTopImageUrl });
  const faqSchema = buildFaqSchema(faqs);
  if (process.env.NODE_ENV === 'development' && faqs.length > 0) {
    console.log(`[FAQ] Schema generated: ${faqSchema ? 'yes' : 'no'}`);
  }

  // 4. 結合（本文 → Article Schema → FAQ Schema）
  const parts = [
    `<!-- NAS Generated Content -->`,
    fullBody,
    articleSchema,
    faqSchema,
  ].filter(Boolean);

  return parts.join('\n\n');
}

/**
 * WordPress REST APIに投稿する
 */
export async function postToWordPress(
  payload: WordPressPostPayload,
  status: 'draft' | 'publish' = 'draft'
): Promise<WordPressPostResult> {
  const wpUrl = process.env.WORDPRESS_URL?.trim();
  const username = process.env.WORDPRESS_USERNAME?.trim();
  const appPassword = process.env.WORDPRESS_APP_PASSWORD?.trim();

  if (!wpUrl || !username || !appPassword) {
    const missing = [
      !wpUrl && 'WORDPRESS_URL',
      !username && 'WORDPRESS_USERNAME',
      !appPassword && 'WORDPRESS_APP_PASSWORD',
    ].filter(Boolean);
    throw new Error(`WordPressの環境変数が設定されていません: ${missing.join(', ')}`);
  }

  const rawCategoryId = process.env.WORDPRESS_CATEGORY_ID?.trim() || '115';
  const categoryId = parseInt(rawCategoryId, 10);
  const safeCategoryId = Number.isNaN(categoryId) || categoryId < 1 ? 115 : categoryId;

  // Basic認証のトークンを生成
  const credentials = Buffer.from(`${username}:${appPassword}`).toString('base64');

  // アイキャッチ画像を先にアップロード（本文最上部の画像URL取得のため）
  let mediaId: number | undefined;
  let bodyTopImageUrl: string | undefined;

  if (payload.imageBase64) {
    try {
      const mediaResult = await uploadBase64ImageToWordPress(
        payload.imageBase64,
        payload.imageBase64MimeType ?? 'image/png',
        credentials,
        wpUrl
      );
      mediaId = mediaResult.id;
      bodyTopImageUrl = mediaResult.sourceUrl;
    } catch (err) {
      console.error('アイキャッチ画像のアップロードに失敗しました（投稿は続行）:', err);
    }
  }

  // 投稿コンテンツ構築（本文最上部に記事画像 → 監修者ブロック → 本文）
  const postContent = buildPostContent(payload, { bodyTopImageUrl });

  const requestUrl = `${wpUrl}/wp-json/wp/v2/posts`;
  const authHeaderValue = `Basic ***`; // ログ用（パスワードは出さない）

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: payload.title,
        content: postContent,
        status: status,
        slug: payload.slug || undefined,
        ...(mediaId ? { featured_media: mediaId } : {}),
        categories: [safeCategoryId],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        (errorData as { message?: string }).message ||
        (errorData as { code?: string }).code ||
        response.statusText;

      // 403 等の原因特定用：詳細をコンソールに出力
      console.error('[WordPress 403 デバッグ] リクエストURL:', requestUrl);
      console.error('[WordPress 403 デバッグ] レスポンスステータス:', response.status);
      console.error('[WordPress 403 デバッグ] レスポンスボディ:', JSON.stringify(errorData, null, 2));
      console.error('[WordPress 403 デバッグ] 認証ヘッダー:', authHeaderValue);

      throw new Error(`WordPress API error: ${response.status} - ${message}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      link: data.link,
      editLink: `${wpUrl}/wp-admin/post.php?post=${data.id}&action=edit`,
      status: data.status,
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('WordPress API error:')) {
      throw err;
    }
    // ネットワークエラー等
    console.error('[WordPress デバッグ] リクエストURL:', requestUrl);
    console.error('[WordPress デバッグ] 認証ヘッダー:', authHeaderValue);
    console.error('[WordPress デバッグ] エラー:', err);
    throw err;
  }
}