import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { title, content, targetKeyword } = await request.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: 'タイトルが必要です' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY!;

  // 記事内容から画像プロンプトを自動生成
  const imagePrompt = buildImagePrompt(title, content, targetKeyword);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [
            { prompt: imagePrompt }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',      // アイキャッチに最適なサイズ
            safetyFilterLevel: 'block_some',
            personGeneration: 'allow_adult',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message ?? `Imagen API error: ${response.status}`);
    }

    const data = await response.json();
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Image) {
      throw new Error('画像データが取得できませんでした');
    }

    return NextResponse.json({
      imageBase64: base64Image,
      mimeType: 'image/png',
      prompt: imagePrompt,
    });

  } catch (error: any) {
    console.error('Imagen error:', error);
    return NextResponse.json(
      { error: error.message || '画像生成に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * 記事タイトル・キーワードから英語の画像プロンプトを生成する
 * Imagen 3は英語プロンプトの方が品質が高いため英語で指定する
 */
function buildImagePrompt(
  title: string,
  content: string,
  targetKeyword?: string
): string {
  // M&A・事業承継関連のキーワードを検出して適切なビジュアルに変換
  const isMARelated = /M&A|事業承継|買収|合併|仲介/.test(title + (targetKeyword ?? ''));
  const isConsultingRelated = /相談|コンサル|アドバイザー|支援/.test(title + (targetKeyword ?? ''));
  const isFinanceRelated = /補助金|税制|融資|資金/.test(title + (targetKeyword ?? ''));

  let visualTheme = '';

  if (isMARelated) {
    visualTheme = 'two business professionals shaking hands in a modern Japanese office, symbolizing business partnership and succession planning';
  } else if (isConsultingRelated) {
    visualTheme = 'professional business consultant presenting strategy to a senior Japanese executive in a conference room';
  } else if (isFinanceRelated) {
    visualTheme = 'Japanese business documents, financial graphs, and professional consultation setting';
  } else {
    visualTheme = 'professional Japanese business environment, modern office with natural light';
  }

  return [
    visualTheme,
    'Professional corporate photography style',
    'Clean and trustworthy atmosphere',
    'Suitable for business article header',
    'High quality, photorealistic',
    'No text or typography in image',
    '16:9 horizontal composition',
  ].join(', ');
}
