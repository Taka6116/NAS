import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { generateFirstDraftFromPrompt } from '@/lib/api/gemini'
import { findFileById, getFilePath } from '@/lib/dataStorage'
import { getS3ObjectAsText } from '@/lib/s3Reference'

const TEXT_MIMES = new Set([
  'text/plain',
  'text/csv',
  'text/html',
  'text/markdown',
  'application/json',
])

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
    const keys = Array.isArray(s3Keys) ? s3Keys.filter((k): k is string => typeof k === 'string') : []

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

    const dataContext = parts.join('\n\n')

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
