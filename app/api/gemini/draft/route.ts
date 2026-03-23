import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { generateFirstDraftFromPrompt } from '@/lib/api/gemini'
import { findFileById, getFilePath } from '@/lib/dataStorage'
import { getS3ObjectAsText, listS3Objects } from '@/lib/s3Reference'

/** 429 時の待機＋再生成を含められるよう長めに（プランにより上限は異なります） */
export const maxDuration = 120

const TEXT_MIMES = new Set([
  'text/plain',
  'text/csv',
  'text/html',
  'text/markdown',
  'application/json',
])

/**
 * 一次執筆用【参照資料】の最大文字数。
 * システムプロンプトが長いため、S3 全件などをそのまま送ると無料枠の「入力トークン/分」（25万）を超えやすい。
 * 必要なら環境変数 GEMINI_DRAFT_MAX_CONTEXT_CHARS で調整（例: 180000）。
 */
function getDraftContextCharLimit(): number {
  const raw = process.env.GEMINI_DRAFT_MAX_CONTEXT_CHARS?.trim()
  if (raw) {
    const n = parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 10_000) return n
  }
  return 100_000
}

async function readFileContentAsText(fileId: string): Promise<{ name: string; content: string } | null> {
  const meta = await findFileById(fileId)
  if (!meta) return null
  const isText = TEXT_MIMES.has(meta.mimeType) || meta.mimeType.startsWith('text/')
  if (!isText) return null
  const filePath = getFilePath(meta.storedName)
  const content = await readFile(filePath, 'utf-8')
  return { name: meta.originalName, content }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, targetKeyword, fileIds, s3Keys } = await request.json()
    const promptStr = typeof prompt === 'string' ? prompt.trim() : ''
    const targetKeywordStr = typeof targetKeyword === 'string' ? targetKeyword.trim() || undefined : undefined
    const ids = Array.isArray(fileIds) ? fileIds.filter((id): id is string => typeof id === 'string') : []
    const explicitS3Keys = Array.isArray(s3Keys) ? s3Keys.filter((k): k is string => typeof k === 'string') : []
    // s3Keys が無い or 空 → S3の全オブジェクトを参照。指定があればそのキーのみ。
    const keys = explicitS3Keys.length > 0 ? explicitS3Keys : (await listS3Objects()).map(o => o.key)

    if (!promptStr) {
      return NextResponse.json(
        { error: 'プロンプトを入力してください' },
        { status: 400 }
      )
    }

    const parts: string[] = []

    if (ids.length > 0) {
      for (const id of ids) {
        const result = await readFileContentAsText(id)
        if (result) {
          parts.push(`--- 資料（アップロード）：${result.name} ---\n${result.content}`)
        }
      }
    }

    if (keys.length > 0) {
      for (const key of keys) {
        const result = await getS3ObjectAsText(key)
        if (result) {
          const name = key.split('/').pop() ?? key
          parts.push(`--- 資料（S3）：${name} ---\n${result.content}`)
        }
      }
    }

    let dataContext = parts.join('\n\n')
    const contextLimit = getDraftContextCharLimit()
    if (dataContext.length > contextLimit) {
      const originalLen = dataContext.length
      dataContext =
        dataContext.slice(0, contextLimit) +
        `\n\n【システム注記】参照資料が長いため、先頭から約${contextLimit.toLocaleString()}文字のみ取り込みました（元の合計: 約${originalLen.toLocaleString()}文字）。` +
        '必要な論点が欠ける場合は S3 の対象を絞るか、アップロード資料のみにするか、Google AI Studio で課金を有効にしてください。'
      console.warn(
        `[gemini/draft] 参照資料を ${contextLimit} 文字で打ち切り (元: ${originalLen} 文字)。GEMINI_DRAFT_MAX_CONTEXT_CHARS で上限変更可。`
      )
    }

    const { title, content } = await generateFirstDraftFromPrompt(
      promptStr,
      targetKeywordStr,
      dataContext || undefined
    )
    return NextResponse.json({ title, content })
  } catch (error) {
    console.error('Gemini draft API error:', error)
    const message =
      error instanceof Error ? error.message : '一次執筆の生成に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
