export async function generateImageWithFirefly(
  title: string,
  content: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません');

  const prompt = buildPrompt(title, content);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          safetyFilterLevel: 'block_medium_and_above',
          personGeneration: 'allow_adult',
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Imagen API error: ${response.status} - ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  const base64 = data.predictions?.[0]?.bytesBase64Encoded;

  if (!base64) {
    throw new Error('画像データが返ってきませんでした（安全フィルターでブロックされた可能性があります）');
  }

  // Base64をdata URIとして返す
  return `data:image/png;base64,${base64}`;
}

export function buildPrompt(title: string, content: string): string {
  const isMA = /M&A|事業承継|買収|合併|仲介/.test(title);
  const isConsulting = /相談|コンサル|アドバイザー|支援/.test(title);
  const isFinance = /補助金|税制|融資|資金/.test(title);

  let theme = 'professional Japanese business environment, modern office';
  if (isMA) theme = 'two business professionals shaking hands in a modern Japanese office, business partnership';
  if (isConsulting) theme = 'professional business consultant presenting to a senior Japanese executive in a conference room';
  if (isFinance) theme = 'Japanese business documents and financial planning in professional office setting';

  return [
    theme,
    'Professional corporate photography',
    'Clean trustworthy atmosphere',
    'Suitable for business article thumbnail',
    'High quality photorealistic',
    'No text no typography',
    'Horizontal 16:9 composition',
    'Soft natural lighting',
  ].join(', ');
}
