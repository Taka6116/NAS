'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SavedArticle } from '@/lib/types'
import { getAllArticles, saveArticle } from '@/lib/articleStorage'
import { ChevronLeft, ChevronRight, Send, Pencil, FileText, CalendarDays, Trash2, Clock, Loader2 } from 'lucide-react'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function toYMD(date: Date) {
  return date.toISOString().slice(0, 10)
}
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function SchedulePage() {
  const router = useRouter()
  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(toYMD(today))
  const [articles, setArticles] = useState<SavedArticle[]>([])
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishResult, setPublishResult] = useState<{ articleId: string; success: boolean; message: string } | null>(null)

  useEffect(() => {
    setArticles(getAllArticles())
    setMounted(true)
  }, [])

  const articlesByDate = useMemo(() => {
    const map: Record<string, SavedArticle[]> = {}
    articles.forEach(a => {
      const d = a.scheduledDate
      if (d) {
        if (!map[d]) map[d] = []
        map[d].push(a)
      }
    })
    return map
  }, [articles])

  const selectedArticles = articlesByDate[selectedDate] ?? []

  const prevMonth = () => {
    if (month === 0) {
      setYear(y => y - 1)
      setMonth(11)
    } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      setYear(y => y + 1)
      setMonth(0)
    } else setMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfWeek = getFirstDayOfMonth(year, month)
  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  const handleScheduleChange = (articleId: string, date: string) => {
    const all = getAllArticles()
    const a = all.find(x => x.id === articleId)
    if (a) {
      a.scheduledDate = date
      saveArticle(a)
      setArticles(getAllArticles())
    }
  }

  const handleTimeChange = (articleId: string, time: string) => {
    const all = getAllArticles()
    const a = all.find(x => x.id === articleId)
    if (a) {
      a.scheduledTime = time
      saveArticle(a)
      setArticles(getAllArticles())
    }
  }

  const handleScheduledPublish = async (article: SavedArticle) => {
    if (!article.scheduledDate || !article.scheduledTime) return
    setPublishingId(article.id)
    setPublishResult(null)

    try {
      const scheduledDate = `${article.scheduledDate}T${article.scheduledTime}:00`
      const content = article.refinedContent || article.originalContent || ''

      const res = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.refinedTitle || article.title,
          content,
          targetKeyword: article.targetKeyword,
          imageUrl: article.imageUrl,
          status: 'draft',
          scheduledDate,
        }),
      })

      const data = await res.json()

      if (res.ok && data.postId) {
        const all = getAllArticles()
        const a = all.find(x => x.id === article.id)
        if (a) {
          a.status = 'published'
          a.wordpressUrl = data.wordpressUrl
          saveArticle(a)
          setArticles(getAllArticles())
        }
        const dateObj = new Date(scheduledDate)
        const timeStr = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${article.scheduledTime}`
        setPublishResult({ articleId: article.id, success: true, message: `下書き保存しました（${timeStr} 公開予定）` })
      } else {
        setPublishResult({ articleId: article.id, success: false, message: data.error || '下書き保存に失敗しました' })
      }
    } catch {
      setPublishResult({ articleId: article.id, success: false, message: 'ネットワークエラーが発生しました' })
    } finally {
      setPublishingId(null)
    }
  }

  const handleDeleteConfirmed = () => {
    if (!deleteTargetId) return
    const all = getAllArticles()
    const target = all.find(x => x.id === deleteTargetId)
    if (target) {
      target.scheduledDate = undefined
      saveArticle(target)
    }
    setArticles(getAllArticles())
    setDeleteTargetId(null)
  }

  if (!mounted) return null

  return (
    <div className="w-full pt-6 pb-12 px-2">
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div
            className="w-full max-w-sm rounded-xl p-5"
            style={{ background: 'white', border: '1px solid #E2E8F0' }}
          >
            <p className="text-sm font-semibold mb-4" style={{ color: '#1A1A2E' }}>
              本当に削除しますか？
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#DC2626' }}
              >
                はい
              </button>
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}
              >
                いいえ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#1A1A2E' }}>
          投稿スケジュール
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          記事の投稿予定日を設定・管理できます
        </p>
      </div>

      <div className="flex gap-5 items-start">
        <div
          className="flex-shrink-0 rounded-2xl p-5"
          style={{
            width: '360px',
            background: 'white',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
              <ChevronLeft size={16} style={{ color: '#64748B' }} />
            </button>
            <span className="font-bold text-base" style={{ color: '#1A1A2E' }}>
              {year}年 {MONTH_NAMES[month]}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
              <ChevronRight size={16} style={{ color: '#64748B' }} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className="text-center text-xs py-1 font-medium"
                style={{ color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#94A3B8' }}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {calendarCells.map((day, idx) => {
              if (!day) return <div key={idx} />

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = dateStr === toYMD(today)
              const isSelected = dateStr === selectedDate
              const dayArticles = articlesByDate[dateStr] ?? []
              const hasPublished = dayArticles.some(a => a.status === 'published')
              const hasReady = dayArticles.some(a => a.status === 'ready')
              const hasDraft = dayArticles.some(a => a.status === 'draft')
              const dotColor = hasPublished ? '#64748B' : hasReady ? '#16A34A' : hasDraft ? '#F59E0B' : null
              const dow = (firstDayOfWeek + day - 1) % 7

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className="flex flex-col items-center justify-center rounded-xl py-1.5 transition-all"
                  style={{
                    background: isSelected ? '#1B2A4A' : isToday ? '#FDF0EE' : 'transparent',
                    border: isToday && !isSelected ? '1.5px solid #C0392B' : '1.5px solid transparent',
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: isSelected
                        ? 'white'
                        : isToday
                          ? '#C0392B'
                          : dow === 0
                            ? '#EF4444'
                            : dow === 6
                              ? '#3B82F6'
                              : '#1A1A2E',
                    }}
                  >
                    {day}
                  </span>
                  {dotColor && (
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-0.5"
                      style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : dotColor }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: '1px solid #F1F5F9' }}>
            {[
              { color: '#16A34A', label: '投稿準備完了' },
              { color: '#F59E0B', label: '下書き' },
              { color: '#64748B', label: '投稿済み' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs" style={{ color: '#94A3B8' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="rounded-xl px-5 py-3 mb-4 flex items-center gap-3"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
          >
            <CalendarDays size={16} style={{ color: '#1B2A4A' }} />
            <span className="font-semibold text-sm" style={{ color: '#1A1A2E' }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </span>
            <span className="text-xs ml-auto" style={{ color: '#94A3B8', fontFamily: 'DM Mono' }}>
              {selectedArticles.length > 0 ? `${selectedArticles.length}件の記事` : '記事なし'}
            </span>
          </div>

          {selectedArticles.length === 0 && (
            <div
              className="rounded-xl p-12 flex flex-col items-center gap-3 text-center"
              style={{ background: 'white', border: '1px solid #E2E8F0', borderStyle: 'dashed' }}
            >
              <FileText size={32} style={{ color: '#E2E8F0' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>
                  この日に予定された記事はありません
                </p>
                <p className="text-xs mt-1" style={{ color: '#CBD5E1' }}>
                  「過去記事一覧」から記事を選び、投稿日を設定してください
                </p>
              </div>
              <button
                onClick={() => router.push('/articles')}
                className="mt-1 px-5 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: '#1B2A4A' }}
              >
                記事一覧へ
              </button>
            </div>
          )}

          <div className="space-y-3">
            {selectedArticles.map(article => {
              const st =
                article.status === 'published'
                  ? { label: '投稿済み', color: '#64748B', bg: '#F8FAFC' }
                  : article.status === 'ready'
                    ? { label: '投稿準備完了', color: '#16A34A', bg: '#F0FDF4' }
                    : { label: '下書き', color: '#F59E0B', bg: '#FFFBEB' }

              return (
                <div
                  key={article.id}
                  className="rounded-xl p-5"
                  style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    {article.imageUrl ? (
                      <img
                        src={article.imageUrl}
                        alt=""
                        className="rounded-lg object-cover flex-shrink-0"
                        style={{ width: 72, height: 50 }}
                      />
                    ) : (
                      <div
                        className="rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ width: 72, height: 50, background: '#F1F5F9' }}
                      >
                        <FileText size={18} style={{ color: '#CBD5E1' }} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ color: st.color, background: st.bg, fontFamily: 'DM Mono' }}
                        >
                          {st.label}
                        </span>
                        {article.targetKeyword && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              color: '#1B2A4A',
                              background: '#F0F4FF',
                              border: '1px solid #C7D7FF',
                              fontFamily: 'DM Mono',
                            }}
                          >
                            KW: {article.targetKeyword}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm leading-snug" style={{ color: '#1A1A2E' }}>
                        {article.refinedTitle || article.title}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: '#94A3B8', fontFamily: 'DM Mono' }}>
                        {article.wordCount?.toLocaleString() ?? 0}文字
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {article.status !== 'published' && (
                        <button
                          onClick={() => router.push(`/editor?articleId=${article.id}&step=5`)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                          style={{ background: '#C0392B', boxShadow: '0 2px 6px rgba(192,57,43,0.2)' }}
                        >
                          <Send size={12} />
                          投稿する
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/editor?articleId=${article.id}&step=1`)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium"
                        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}
                      >
                        <Pencil size={12} />
                        編集する
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(article.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium"
                        style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                      >
                        <Trash2 size={12} />
                        削除
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 space-y-3" style={{ borderTop: '1px solid #F1F5F9' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#94A3B8' }}>
                        投稿予定日を変更：
                      </span>
                      <input
                        type="date"
                        value={article.scheduledDate ?? ''}
                        onChange={e => {
                          handleScheduleChange(article.id, e.target.value)
                          setSelectedDate(e.target.value)
                        }}
                        className="text-xs px-2 py-1 rounded-md border"
                        style={{
                          border: '1px solid #E2E8F0',
                          color: '#64748B',
                          fontFamily: 'DM Mono',
                          background: '#FAFBFC',
                        }}
                      />
                      <Clock size={14} style={{ color: '#94A3B8', marginLeft: 4 }} />
                      <input
                        type="time"
                        value={article.scheduledTime ?? ''}
                        onChange={e => handleTimeChange(article.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded-md border"
                        style={{
                          border: '1px solid #E2E8F0',
                          color: '#64748B',
                          fontFamily: 'DM Mono',
                          background: '#FAFBFC',
                        }}
                      />
                    </div>

                    {article.status !== 'published' && article.scheduledDate && article.scheduledTime && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleScheduledPublish(article)}
                          disabled={publishingId === article.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                          style={{ background: '#1B2A4A', boxShadow: '0 2px 6px rgba(27,42,74,0.2)' }}
                        >
                          {publishingId === article.id ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              予約投稿中...
                            </>
                          ) : (
                            <>
                              <Clock size={12} />
                              予約投稿する
                            </>
                          )}
                        </button>
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          {article.scheduledTime} に自動公開されます
                        </span>
                      </div>
                    )}

                    {publishResult?.articleId === article.id && (
                      <div
                        className="text-xs px-3 py-2 rounded-lg"
                        style={{
                          background: publishResult.success ? '#F0FDF4' : '#FEF2F2',
                          color: publishResult.success ? '#16A34A' : '#DC2626',
                          border: `1px solid ${publishResult.success ? '#BBF7D0' : '#FECACA'}`,
                        }}
                      >
                        {publishResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {(() => {
            const unscheduled = articles.filter(a => !a.scheduledDate && a.status !== 'published')
            if (unscheduled.length === 0) return null
            return (
              <div className="mt-6">
                <p
                  className="text-xs font-semibold mb-3"
                  style={{ color: '#94A3B8', letterSpacing: '0.08em', fontFamily: 'DM Mono' }}
                >
                  投稿日未設定の記事 ({unscheduled.length}件)
                </p>
                <div className="space-y-2">
                  {unscheduled.map(article => (
                    <div
                      key={article.id}
                      className="rounded-xl px-4 py-3 flex items-center gap-3"
                      style={{ background: 'white', border: '1px solid #E2E8F0' }}
                    >
                      <FileText size={14} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                      <span className="flex-1 text-sm truncate" style={{ color: '#64748B' }}>
                        {article.refinedTitle || article.title}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          この日に設定：
                        </span>
                        <button
                          onClick={() => {
                            handleScheduleChange(article.id, selectedDate)
                          }}
                          className="text-xs px-3 py-1 rounded-lg font-medium"
                          style={{ background: '#F0F4FF', color: '#1B2A4A', border: '1px solid #C7D7FF' }}
                        >
                          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          に追加
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
