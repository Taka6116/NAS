import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  const { title, content, targetKeyword } = await request.json()

  if (!title?.trim()) {
    return NextResponse.json(
      { error: 'タイトルが必要です' },
      { status: 400 }
    )
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()
  if (!accessKeyId || !secretAccessKey) {
    return NextResponse.json(
      { error: 'AWS認証情報（AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY）が設定されていません。.env.local と Vercel の環境変数を確認してください。' },
      { status: 500 }
    )
  }

  const prompt = buildPrompt(
    title,
    typeof targetKeyword === 'string' ? targetKeyword : undefined
  )

  const requestBody = {
    prompt,
    negative_prompt:
      'text, typography, watermark, logo, low quality, blurry, cartoon, anime, nsfw',
    mode: 'text-to-image',
    aspect_ratio: '16:9',
    output_format: 'png',
  }

  const bodyBytes = new TextEncoder().encode(JSON.stringify(requestBody))

  try {
    const command = new InvokeModelCommand({
      modelId: 'stability.sd3-5-large-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: bodyBytes,
    })

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

    return NextResponse.json({
      imageBase64: base64Image,
      mimeType: 'image/png',
      prompt,
    })
  } catch (error) {
    console.error('Bedrock image error:', error)
    let message = '画像生成に失敗しました'
    if (error instanceof Error) {
      message = error.name === 'AccessDeniedException'
        ? 'Bedrock の利用権限がありません。IAM に bedrock:InvokeModel を追加してください。'
        : error.name === 'ResourceNotFoundException'
          ? '指定したモデル（stability.sd3-5-large-v1:0）が見つかりません。BEDROCK_REGION=us-east-1 を確認してください。'
          : error.message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function buildPrompt(title: string, targetKeyword?: string): string {
  const text = title + (targetKeyword ?? '')
  const isMA = /M&A|事業承継|買収|合併|仲介/.test(text)
  const isConsulting = /相談|コンサル|アドバイザー|支援/.test(text)
  const isFinance = /補助金|税制|融資|資金|節税/.test(text)
  const isPMI = /PMI|統合|引継ぎ/.test(text)
  const isSuccession = /後継者|承継|引継/.test(text)

  let theme = 'professional Japanese business environment, modern office'

  if (isMA) {
    theme =
      'two senior Japanese business executives shaking hands, successful M&A agreement, modern corporate office'
  } else if (isPMI) {
    theme =
      'Japanese business team collaborating on integration project, modern office, positive atmosphere'
  } else if (isSuccession) {
    theme =
      'senior Japanese business owner passing documents to successor, professional office, business succession'
  } else if (isConsulting) {
    theme =
      'professional consultant presenting strategy to Japanese executive, conference room, trustworthy'
  } else if (isFinance) {
    theme =
      'Japanese business professional reviewing financial documents, clean modern office'
  }

  return [
    theme,
    'Professional corporate photography',
    'High quality photorealistic',
    'Soft natural lighting',
    'No text no typography no watermark',
    'Horizontal 16:9 composition',
  ].join(', ')
}
