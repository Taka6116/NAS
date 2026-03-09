export interface WordPressPostPayload {
  title: string;
  content: string;          // 推敲済み本文（プレーンテキスト）
  targetKeyword?: string;
  imageUrl?: string;        // アイキャッチ画像URL
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
 * 画像URLをWordPressメディアライブラリにアップロードし、メディアIDを返す
 */
export async function uploadImageToWordPress(imageUrl: string): Promise<number> {
  const wpUrl = process.env.WORDPRESS_URL!;
  const username = process.env.WORDPRESS_USERNAME!;
  const appPassword = process.env.WORDPRESS_APP_PASSWORD!;
  const credentials = Buffer.from(`${username}:${appPassword}`).toString('base64');

  // 画像をバイナリで取得
  const imageRes = await fetch(imageUrl);
  const imageBuffer = await imageRes.arrayBuffer();
  const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg';
  const fileName = `nas-image-${Date.now()}.jpg`;

  // WordPressメディアAPIにアップロード
  const uploadRes = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Type': contentType,
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`画像アップロード失敗: ${uploadRes.status}`);
  }

  const media = await uploadRes.json();
  return media.id;  // featured_media パラメータに使用
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
 * HTML本文 + Article Schema + FAQ Schema を結合
 */
export function buildPostContent(payload: WordPressPostPayload): string {
  const slug = payload.slug || payload.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);

  // 1. 本文をHTMLに変換
  const htmlBody = convertToHtml(payload.content);

  // 2. FAQを抽出
  const faqs = extractFaqs(payload.content);

  // 3. Schema生成
  const articleSchema = buildArticleSchema(payload, slug);
  const faqSchema = buildFaqSchema(faqs);

  // 4. 結合（本文 → Article Schema → FAQ Schema）
  const parts = [
    `<!-- NAS Generated Content -->`,
    htmlBody,
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
  const wpUrl = process.env.WORDPRESS_URL!;
  const username = process.env.WORDPRESS_USERNAME!;
  const appPassword = process.env.WORDPRESS_APP_PASSWORD!;

  // Basic認証のトークンを生成
  const credentials = Buffer.from(`${username}:${appPassword}`).toString('base64');

  // 投稿コンテンツ構築
  const postContent = buildPostContent(payload);

  let mediaId: number | undefined;
  if (payload.imageUrl) {
    try {
      mediaId = await uploadImageToWordPress(payload.imageUrl);
    } catch (e) {
      console.warn('画像アップロードに失敗しましたが、投稿は継続します', e);
    }
  }

  // WordPress REST APIにPOST
  const response = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
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
      // categories: [categoryId],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `WordPress API error: ${response.status} - ${errorData.message || response.statusText}`
    );
  }

  const data = await response.json();

  return {
    id: data.id,
    link: data.link,
    editLink: `${wpUrl}/wp-admin/post.php?post=${data.id}&action=edit`,
    status: data.status,
  };
}