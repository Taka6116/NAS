import { postToWordPress } from '@/lib/wordpress'

export async function POST(request: Request) {
  const body = await request.json()
  const { title, content, targetKeyword, imageUrl, slug, status } = body

  if (!title?.trim() || !content?.trim()) {
    return Response.json(
      { error: 'タイトルと本文は必須です' },
      { status: 400 }
    )
  }

  try {
    const result = await postToWordPress(
      { title, content, targetKeyword, imageUrl, slug },
      status ?? 'draft'    // デフォルトは下書き
    )

    return Response.json({
      success: true,
      postId: result.id,
      postUrl: result.link,
      editUrl: result.editLink,
      status: result.status,
    })

  } catch (error: any) {
    console.error('WordPress post error:', error)
    return Response.json(
      { error: error.message || 'WordPress投稿に失敗しました' },
      { status: 500 }
    )
  }
}
