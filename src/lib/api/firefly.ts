import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
})

/**
 * AWS Bedrock Stable Diffusion 3.5 Large で画像を生成する
 * 戻り値：data:image/png;base64,... 形式のURL
 */
export async function generateImageWithFirefly(
  title: string,
  content: string
): Promise<string> {
  if (!process.env.AWS_ACCESS_KEY_ID?.trim() || !process.env.AWS_SECRET_ACCESS_KEY?.trim()) {
    throw new Error(
      'AWS認証情報（AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY）が設定されていません。'
    )
  }
  const prompt = buildPrompt(title, content)

  const requestBody = {
    prompt,
    negative_prompt:
      'text, typography, watermark, logo, low quality, blurry, cartoon, anime, nsfw',
    mode: 'text-to-image',
    aspect_ratio: '16:9',
    output_format: 'png',
  }

  const bodyBytes = new TextEncoder().encode(JSON.stringify(requestBody))
  const command = new InvokeModelCommand({
    modelId: 'stability.sd3-5-large-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: bodyBytes,
  })

  try {
    const response = await bedrockClient.send(command)

    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    ) as { images?: string[]; finish_reasons?: (string | null)[] }

    const reason = responseBody.finish_reasons?.[0]
    if (reason != null && reason !== '') {
      throw new Error(
        'コンテンツフィルターにより画像が生成されませんでした。プロンプトを変えて再試行してください。'
      )
    }

    const base64Image = responseBody.images?.[0]
    if (!base64Image) {
      throw new Error('画像データが返ってきませんでした')
    }

    return `data:image/png;base64,${base64Image}`
  } catch (error) {
    console.error('Bedrock Stable Diffusion error:', error)
    let message = 'Stable Diffusion による画像生成に失敗しました'
    if (error instanceof Error) {
      message =
        error.name === 'AccessDeniedException'
          ? 'Bedrock の利用権限がありません。IAM に bedrock:InvokeModel を追加してください。'
          : error.name === 'ResourceNotFoundException'
            ? '指定したモデルが見つかりません。BEDROCK_REGION=us-east-1 を確認してください。'
            : error.message
    }
    throw new Error(message)
  }
}

/**
 * 記事タイトル・本文から英語の画像プロンプトを生成する
 * SD 3.5は英語プロンプトの方が品質が高い
 */
export function buildPrompt(title: string, content: string): string {
  const isMA = /M&A|事業承継|買収|合併|仲介/.test(title)
  const isConsulting = /相談|コンサル|アドバイザー|支援/.test(title)
  const isFinance = /補助金|税制|融資|資金|節税/.test(title)
  const isPMI = /PMI|統合|引継ぎ/.test(title)
  const isSuccession = /後継者|承継|引継/.test(title)

  let theme =
    'professional Japanese business environment, modern office with natural light'

  if (isMA) {
    theme =
      'two senior Japanese business executives shaking hands across a conference table, symbolizing successful business partnership and M&A agreement, modern Japanese corporate office'
  } else if (isPMI) {
    theme =
      'Japanese business team collaborating in a modern office, diverse professionals working together on integration project, positive corporate atmosphere'
  } else if (isSuccession) {
    theme =
      'senior Japanese business owner passing documents to younger successor, warm professional office setting, symbolizing business succession and legacy'
  } else if (isConsulting) {
    theme =
      'professional Japanese business consultant presenting strategy charts to senior executive, conference room with city view, trustworthy atmosphere'
  } else if (isFinance) {
    theme =
      'Japanese business professional reviewing financial documents and graphs, clean modern office desk, professional corporate photography'
  }

  return [
    theme,
    'Professional corporate photography style',
    'High quality photorealistic',
    'Soft natural lighting',
    'Clean and trustworthy atmosphere',
    'Suitable for business article thumbnail',
    'No text no typography no watermark',
    'Horizontal composition',
  ].join(', ')
}
