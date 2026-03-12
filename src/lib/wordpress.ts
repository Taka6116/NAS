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

// 監修者画像（大野 駿介さん）のURL。環境変数で上書き可能。
const SUPERVISOR_IMAGE_URL =
  process.env.WORDPRESS_SUPERVISOR_IMAGE_URL ??
  'https://nihon-teikei.co.jp/wp-content/uploads/ohno-supervisor.jpg';

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
 * プレーンテキストの本文をHTMLに変換する
 * Geminiが生成した本文フォーマット：
 * - 「1. 見出し」→ <h2>
 * - 「1-1. 小見出し」→ <h3>
 * - 空行区切り → <p>
 */
export function convertToHtml(content: string): string {
  const lines = content.split('\n');
  const htmlLines: string[] = [];
  let currentParagraph: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join('<br>').trim();
      if (text) {
        htmlLines.push(`<p>${text}</p>`);
      }
      currentParagraph = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // 空行：段落を区切る
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // H2：「1. 」「2. 」形式
    if (/^\d+[．.]\s/.test(trimmed)) {
      flushParagraph();
      const text = trimmed.replace(/^\d+[．.]\s*/, '');
      htmlLines.push(`<h2>${text}</h2>`);
      continue;
    }

    // H3：「1-1. 」「1-2. 」形式
    if (/^\d+-\d+[．.]\s/.test(trimmed)) {
      flushParagraph();
      const text = trimmed.replace(/^\d+-\d+[．.]\s*/, '');
      htmlLines.push(`<h3>${text}</h3>`);
      continue;
    }

    // H3：「■」「▶」「◆」「●」「▼」形式
    if (/^[■▶◆●▼]\s/.test(trimmed)) {
      flushParagraph();
      const text = trimmed.replace(/^[■▶◆●▼]\s*/, '');
      htmlLines.push(`<h3>${text}</h3>`);
      continue;
    }

    // 通常テキスト：段落に追加
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
 * メインの投稿コンテンツを構築
 * 順序: 本文最上部に記事画像（アイキャッチと同じ）→ 監修者ブロック → 記事本文 → Schema
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

  // 1. 本文をHTMLに変換
  const htmlBody = convertToHtml(payload.content);

  // 1-1. 本文最上部：ウェブアプリで作成した画像（アイキャッチと同じ）
  const bodyTopImageBlock =
    options?.bodyTopImageUrl
      ? `
<figure style="margin:0 0 32px;text-align:center;">
  <img src="${options.bodyTopImageUrl}" alt="" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:0 auto;" loading="eager"/>
</figure>
`.trim()
      : '';

  // 1-2. 監修者ブロック（記事画像の直下に挿入）
  const supervisorBlock = SUPERVISOR_IMAGE_URL
    ? `
<!-- Supervisor Block -->
<div style="text-align:center;margin:32px auto 40px;max-width:780px;">
  <div style="display:inline-block;text-align:left;background:#f8fafc;border-radius:16px;padding:24px 24px 20px;border:1px solid #e2e8f0;">
    <div style="display:flex;gap:16px;align-items:flex-start;">
      <img src="${SUPERVISOR_IMAGE_URL}"
           alt="株式会社日本提携支援 代表取締役 大野 駿介"
           style="width:96px;height:96px;border-radius:999px;object-fit:cover;flex-shrink:0;"/>
      <div style="font-size:14px;line-height:1.6;color:#1e293b;">
        <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:#0f172a;">監修者</div>
        <div style="font-weight:700;">株式会社日本提携支援 代表取締役<br/>大野 駿介</div>
        <div style="margin-top:6px;font-size:13px;color:#475569;">
          過去1,000件超のM&A相談、50件超のアドバイザリー契約、15組超のM&A成約組数を担当。(株)日本M&amp;Aセンターにて、年間最多アドバイザリー契約受賞経験あり。新規提携先の開拓やマネジメント経験を経て、(株)日本提携支援を設立。
        </div>
      </div>
    </div>
  </div>
</div>
`.trim()
    : '';

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