import { NextRequest, NextResponse } from 'next/server'
import { buildPrompt } from '@/lib/api/firefly'

// 002 が利用できない環境では 001 をフォールバックで使用
const IMAGEN_MODELS = [
  'imagen-3.0-generate-002',
  'imagen-3.0-generate-001',
] as const
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

export async function POST(request: NextRequest) {
  const { title, content, targetKeyword } = await request.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: 'タイトルが必要です' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY が設定されていません' }, { status: 500 });
  }

  const promptText = buildPrompt(
    targetKeyword?.trim() ? `${title} ${targetKeyword}` : title,
    content ?? ''
  );

  const body = {
    instances: [{ prompt: promptText }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '16:9',
      safetyFilterLevel: 'block_medium_and_above',
      personGeneration: 'allow_adult',
    },
  };

  let lastError: string = '';

  for (const model of IMAGEN_MODELS) {
    const url = `${BASE_URL}/${model}:predict?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const rawText = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        lastError = `モデル ${model}: レスポンスがJSONではありません (${response.status}) ${rawText.slice(0, 200)}`;
        continue;
      }

      if (!response.ok) {
        const errMsg = (data as { error?: { message?: string } }).error?.message ?? JSON.stringify(data);
        lastError = `モデル ${model}: ${response.status} - ${errMsg}`;
        console.error('[Imagen]', lastError);
        continue;
      }

      const base64Image = (data.predictions as Array<{ bytesBase64Encoded?: string }>)?.[0]?.bytesBase64Encoded;

      if (!base64Image) {
        lastError = `モデル ${model}: 画像データなし。レスポンスキー: ${Object.keys(data).join(', ')}`;
        console.error('[Imagen]', lastError, data);
        continue;
      }

      return NextResponse.json({
        imageBase64: base64Image,
        mimeType: 'image/png',
        prompt: promptText,
      });
    } catch (err) {
      lastError = `モデル ${model}: ${err instanceof Error ? err.message : String(err)}`;
      console.error('[Imagen]', lastError);
    }
  }

  return NextResponse.json(
    { error: lastError || '画像生成に失敗しました。すべてのモデルでエラーになりました。' },
    { status: 500 }
  );
}
