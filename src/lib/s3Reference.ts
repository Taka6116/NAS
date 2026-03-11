import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'

const TEXT_EXT = new Set(['.txt', '.csv', '.md', '.json', '.html', '.xml'])
const REGION = process.env.AWS_REGION ?? 'ap-northeast-1'
const BUCKET = process.env.S3_BUCKET_NAME?.trim()

function getClient(): S3Client | null {
  if (!BUCKET) return null
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()
  if (!accessKeyId || !secretAccessKey) return null
  return new S3Client({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export interface S3ObjectItem {
  key: string
  size: number
  lastModified: string
}

export async function listS3Objects(prefix?: string): Promise<S3ObjectItem[]> {
  const client = getClient()
  if (!client) return []
  const command = new ListObjectsV2Command({
    Bucket: BUCKET!,
    Prefix: prefix || undefined,
    MaxKeys: 200,
  })
  const out = await client.send(command)
  const list = out.Contents ?? []
  return list
    .filter((o): o is { Key: string; Size?: number; LastModified?: Date } => !!o.Key)
    .map(o => ({
      key: o.Key!,
      size: o.Size ?? 0,
      lastModified: o.LastModified?.toISOString() ?? '',
    }))
}

/** S3オブジェクトをテキストとして取得。テキスト系拡張子のみ対応 */
export async function getS3ObjectAsText(key: string): Promise<{ key: string; content: string } | null> {
  const client = getClient()
  if (!client) return null
  const ext = key.includes('.') ? key.slice(key.lastIndexOf('.')) : ''
  if (!TEXT_EXT.has(ext.toLowerCase())) return null
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET!, Key: key })
    const res = await client.send(command)
    const body = res.Body
    if (!body) return null
    const bytes = await body.transformToByteArray()
    const content = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    return { key, content }
  } catch {
    return null
  }
}
