import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

/** Stable Diffusion 3.5 は us-west-2 でのみ利用可能 */
const BEDROCK_IMAGE_REGION = 'us-west-2'

function getBedrockClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: process.env.BEDROCK_REGION ?? BEDROCK_IMAGE_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

/**
 * AWS Bedrock Stable Diffusion 3.5 Large で画像を生成する
 * 戻り値：data:image/jpeg;base64,... 形式のURL（容量削減のため JPEG 出力）
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
    negative_prompt: [
      'portrait, headshot, close-up face, selfie',
      'revealing clothing, cleavage, exposed skin',
      'western faces, caucasian, blonde',
      'text, typography, watermark, logo',
      'cartoon, anime, illustration, painting',
      'low quality, blurry, distorted, deformed',
      'bright neon colors, colorful',
      'nsfw, inappropriate',
    ].join(', '),
    mode: 'text-to-image',
    aspect_ratio: '16:9',
    output_format: 'jpeg',
  }

  const bodyBytes = new TextEncoder().encode(JSON.stringify(requestBody))
  const command = new InvokeModelCommand({
    modelId: 'stability.sd3-5-large-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: bodyBytes,
  })

  try {
    const client = getBedrockClient()
    const response = await client.send(command)

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

    return `data:image/jpeg;base64,${base64Image}`
  } catch (error) {
    console.error('Bedrock Stable Diffusion error:', error)
    let message = 'Stable Diffusion による画像生成に失敗しました'
    if (error instanceof Error) {
      message =
        error.name === 'AccessDeniedException'
          ? 'Bedrock の利用権限がありません。IAM に bedrock:InvokeModel を追加してください。'
          : error.name === 'ResourceNotFoundException'
            ? '指定したモデルが見つかりません。BEDROCK_REGION=us-west-2 を確認してください。'
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
  const text = title + content.slice(0, 200)

  const isContract = /契約|NDA|秘密保持|意向表明/.test(text)
  const isFinance = /補助金|税制|融資|資金|節税|バリュエーション|企業価値/.test(text)
  const isPMI = /PMI|統合|経営統合/.test(text)
  const isSuccession = /後継者|引継|承継/.test(text)
  const isMA = /M&A|買収|合併|仲介|売却/.test(text)

  // 全テーマ共通：顔アップ禁止・引き画・手元・書類メイン
  let theme = ''

  if (isContract) {
    theme =
      'overhead flat-lay of business contract documents and fountain pen on white desk, professional corporate photography'
  } else if (isFinance) {
    theme =
      'overhead view of financial charts, graphs and business reports spread on conference table with hands pointing, no faces visible'
  } else if (isPMI) {
    theme =
      'wide shot of modern Japanese conference room, business team seen from behind gathered around table with documents, integration meeting'
  } else if (isSuccession) {
    theme =
      'mid shot of two pairs of hands exchanging business documents across a desk, warm office lighting, succession symbolism, no faces'
  } else if (isMA) {
    theme =
      'wide shot of corporate meeting room with business professionals in suits seen from behind, documents and laptops on table, M&A negotiation setting'
  } else {
    theme =
      'overhead flat-lay of Japanese business documents, notebook, pen and laptop on clean office desk, professional corporate style'
  }

  return [
    theme,
    'professional Japanese corporate photography',
    'photorealistic high quality',
    'navy blue white grey color palette',
    'soft natural window lighting',
    'NO faces NO close-up portraits NO headshots',
    'NO text NO watermark NO logo',
    'NO revealing clothing NO casual wear',
    'horizontal 16:9 composition',
    'wide or overhead shot',
  ].join(', ')
}
