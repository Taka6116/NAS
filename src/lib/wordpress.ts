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

/**
 * 監修者画像（大野 駿介さん）のURLを実行時に取得。
 * 優先: SUPERVISOR_IMAGE_URL（フルURL） > (NEXT_PUBLIC_CLOUDFRONT_URL + SUPERVISOR_IMAGE_PATH) > WORDPRESS_SUPERVISOR_IMAGE_URL > デフォルト
 * S3のみ使用する場合（CloudFrontなし）:
 *   SUPERVISOR_IMAGE_URL=https://data-for-nas.s3.ap-northeast-1.amazonaws.com/pictures/%E5%A4%A7%E9%87%8E%E6%A7%98.png
 */
export function getSupervisorImageUrl(): string {
  const direct = process.env.SUPERVISOR_IMAGE_URL?.trim();
  if (direct) return direct;
  const cloudFront = process.env.NEXT_PUBLIC_CLOUDFRONT_URL?.trim();
  const path = process.env.SUPERVISOR_IMAGE_PATH?.trim();
  if (cloudFront) {
    const base = cloudFront.replace(/\/$/, '');
    return path ? `${base}/${path}` : `${base}/images/supervisor/ohno-shunsuke.jpg`;
  }
  return process.env.WORDPRESS_SUPERVISOR_IMAGE_URL?.trim() ?? 'https://nihon-teikei.co.jp/wp-content/uploads/ohno-supervisor.jpg';
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
  return { id: media.id, sourceUrl: media.source_url ?? media.link };
}

/**
 * インラインのマークダウン風記法をHTMLに変換（WordPress表示用）
 * - **太字** → <strong>
 * - __下線__ → <span style="text-decoration:underline;">
 * - *斜体* → <em>
 * - 既存の <strong>, <em>, <u>, <a>, <br> はそのまま通過
 */
function applyInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<span style="text-decoration:underline;">$1</span>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
}

/** リスト行「・ラベル: 説明」のラベル部分を太字に */
function emphasizeListLabel(line: string): string {
  const match = line.match(/^([・\s]*)([^：:]+)([：:])\s*(.*)$/);
  if (match) {
    const [, bullet, label, colon, rest] = match;
    return `${bullet}<strong>${label.trim()}</strong>${colon} ${rest}`;
  }
  return applyInlineFormatting(line);
}

const HEADING_STYLE = 'font-weight:700;color:#1e3a8a;margin:1em 0 0.5em;';
const H2_STYLE = HEADING_STYLE + 'font-size:1.25em;';
const H3_STYLE = HEADING_STYLE + 'font-size:1.05em;';

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
        htmlLines.push(`<p style="line-height:1.8;">${text}</p>`);
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

/**
 * 本文からFAQ候補を抽出する（Q&A形式の箇所を検出）
 * Geminiが生成したFAQセクションを構造化データに変換
 */
function extractFaqs(content: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];

  // 「Q：〜」「A：〜」形式を検出
  const qaPattern = /Q[：:]\s*(.+?)\nA[：:]\s*(.+?)(?=\nQ[：:]|\n\n|\n■|\n\d+[．.]|$)/gs;
  const matches = content.matchAll(qaPattern);

  for (const match of matches) {
    faqs.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
  }

  return faqs;
}

/**
 * Article Schema（構造化データ）を生成
 */
function buildArticleSchema(payload: WordPressPostPayload, slug: string): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': payload.title,
    'datePublished': new Date().toISOString().split('T')[0],
    'dateModified': new Date().toISOString().split('T')[0],
    'author': {
      '@type': 'Organization',
      'name': '株式会社日本提携支援',
      'url': 'https://nihon-teikei.co.jp',
    },
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
    ...(payload.imageUrl ? {
      'image': {
        '@type': 'ImageObject',
        'url': payload.imageUrl,
      },
    } : {}),
    ...(payload.targetKeyword ? {
      'keywords': payload.targetKeyword,
      'about': {
        '@type': 'Thing',
        'name': payload.targetKeyword,
      },
    } : {}),
  };

  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

/**
 * FAQPage Schema を生成（FAQが存在する場合のみ）
 */
function buildFaqSchema(faqs: Array<{ question: string; answer: string }>): string {
  if (faqs.length === 0) return '';

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
  const htmlBody = convertToHtml(contentWithoutSupervisorText);

  // 1-1. 本文最上部：アイキャッチ画像（監修者ブロックの前、中央・max-width:800px）
  const bodyTopImageBlock =
    options?.bodyTopImageUrl
      ? `
<figure style="margin:0 0 32px;text-align:center;">
  <img src="${options.bodyTopImageUrl}" alt="" style="max-width:800px;width:100%;height:auto;border-radius:8px;display:block;margin:0 auto;" loading="eager"/>
</figure>
`.trim()
      : '';

  // 1-2. 監修者ブロック（必ず挿入）：ウェブアプリ生成画像の直下、灰色背景・左に丸画像・右にテキスト
  const supervisorImageUrl = getSupervisorImageUrl();
  const supervisorBlock = `
<div style="background:#f3f4f6;border-radius:12px;padding:24px;margin:32px 0 40px;max-width:800px;margin-left:auto;margin-right:auto;">
  <p style="font-weight:700;color:#1e293b;margin:0 0 16px 0;padding-bottom:8px;border-bottom:1px solid #e5e7eb;text-align:center;">監修者</p>
  <div style="display:flex;gap:20px;align-items:flex-start;">
    <img src="${supervisorImageUrl}" alt="大野駿介" style="width:100px;height:100px;border-radius:50%;object-fit:cover;object-position:center;flex-shrink:0;display:block;"/>
    <div style="flex:1;min-width:0;font-size:14px;line-height:1.7;color:#374151;">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">株式会社日本提携支援 代表取締役</p>
      <p style="margin:0 0 8px;font-weight:700;font-size:16px;color:#111827;">大野 駿介</p>
      <p style="margin:0;font-size:13px;color:#4b5563;">過去1,000件超のM&amp;A相談、50件超のアドバイザリー契約、15組超のM&amp;A成約組数を担当。(株)日本M&amp;Aセンターにて、年間最多アドバイザリー契約受賞経験あり。新規提携先の開拓やマネジメント経験を経て、(株)日本提携支援を設立。</p>
    </div>
  </div>
</div>
`.trim();

  const fullBody = [bodyTopImageBlock, supervisorBlock, htmlBody].filter(Boolean).join('\n\n');

  // 2. FAQを抽出
  const faqs = extractFaqs(payload.content);

  // 3. Schema生成（投稿には必ず含める）
  const articleSchema = buildArticleSchema(payload, slug);
  const faqSchema = buildFaqSchema(faqs);

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