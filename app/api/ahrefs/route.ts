import { NextRequest, NextResponse } from 'next/server'
import { parseAhrefsCsv, type AhrefsDataset, type DatasetMeta } from '@/lib/ahrefsCsvParser'
import { putS3Object, getS3ObjectAsText, deleteS3Object, listS3Objects } from '@/lib/s3Reference'

const PREFIX = 'kw-analysis/'
const INDEX_KEY = `${PREFIX}index.json`

function decodeCSVBuffer(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(bytes)
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(bytes)
  }
  const text = new TextDecoder('utf-8').decode(bytes)
  return text.replace(/^\uFEFF/, '')
}

async function loadIndex(): Promise<DatasetMeta[]> {
  const obj = await getS3ObjectAsText(INDEX_KEY)
  if (!obj) return []
  try {
    return JSON.parse(obj.content) as DatasetMeta[]
  } catch {
    return []
  }
}

async function saveIndex(index: DatasetMeta[]): Promise<void> {
  await putS3Object(INDEX_KEY, JSON.stringify(index, null, 2))
}

// POST: CSV upload → parse → S3 save
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const csvText = decodeCSVBuffer(bytes)

    const { rows, type } = parseAhrefsCsv(csvText)
    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSVにキーワードデータがありません' }, { status: 400 })
    }

    const id = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()

    const dataset: AhrefsDataset = {
      id,
      uploadedAt: now,
      fileName: file.name,
      rowCount: rows.length,
      type,
      keywords: rows,
    }

    const datasetKey = `${PREFIX}datasets/${id}.json`
    const saved = await putS3Object(datasetKey, JSON.stringify(dataset))
    if (!saved) {
      return NextResponse.json({ error: 'S3への保存に失敗しました' }, { status: 500 })
    }

    const index = await loadIndex()
    index.push({ id, uploadedAt: now, fileName: file.name, rowCount: rows.length, type })
    await saveIndex(index)

    return NextResponse.json({ id, fileName: file.name, rowCount: rows.length, type })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'CSVの処理に失敗しました'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

// GET: load all datasets
export async function GET() {
  try {
    const index = await loadIndex()
    const datasets: AhrefsDataset[] = []

    for (const meta of index) {
      const key = `${PREFIX}datasets/${meta.id}.json`
      const obj = await getS3ObjectAsText(key)
      if (obj) {
        try {
          datasets.push(JSON.parse(obj.content) as AhrefsDataset)
        } catch {
          /* skip corrupt */
        }
      }
    }

    return NextResponse.json({ index, datasets })
  } catch {
    return NextResponse.json({ index: [], datasets: [] })
  }
}

// DELETE: remove dataset(s)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const key = `${PREFIX}datasets/${id}.json`
      await deleteS3Object(key)
      const index = await loadIndex()
      const updated = index.filter(m => m.id !== id)
      await saveIndex(updated)
      return NextResponse.json({ deleted: id })
    }

    // Delete all
    const objects = await listS3Objects(PREFIX)
    for (const obj of objects) {
      await deleteS3Object(obj.key)
    }
    return NextResponse.json({ deleted: 'all' })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
