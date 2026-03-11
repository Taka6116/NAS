const IMAGEN_MODELS = ['imagen-3.0-generate-002', 'imagen-3.0-generate-001'] as const
const IMAGEN_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export async function generateImageWithFirefly(
  title: string,
  content: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません')

  const prompt = buildPrompt(title, content)
  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '16:9',
      safetyFilterLevel: 'block_medium_and_above',
      personGeneration: 'allow_adult',
    },
  }

  let lastError = ''
  for (const model of IMAGEN_MODELS) {
    try {
      const response = await fetch(
        `${IMAGEN_BASE}/${model}:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      const rawText = await response.text()
      let data: Record<string, unknown> = {}
      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch {
        lastError = `モデル ${model}: レスポンスがJSONではありません (${response.status})`
        continue
      }
      if (!response.ok) {
        const errMsg = (data as { error?: { message?: string } }).error?.message ?? JSON.stringify(data)
        lastError = `モデル ${model}: ${response.status} - ${errMsg}`
        continue
      }
      const base64 = (data.predictions as Array<{ bytesBase64Encoded?: string }>)?.[0]?.bytesBase64Encoded
      if (!base64) {
        lastError = `モデル ${model}: 画像データなし`
        continue
      }
      return `data:image/png;base64,${base64}`
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }
  throw new Error(lastError || '画像生成に失敗しました。すべてのモデルでエラーになりました。')
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
