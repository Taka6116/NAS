'use client'

import { useState } from 'react'
import { ArticleData, InternalLinkEntry } from '@/lib/types'
import { LINK_BANK_USEFUL, LINK_BANK_CASE } from '@/lib/linkBank'
import StepIndicator from './StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, Link2, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'

interface InternalLinkStepProps {
  article: ArticleData
  onInternalLinksChange: (links: InternalLinkEntry[]) => void
  onBack: () => void
  onNext: () => void
}

function hasAnchorInContent(content: string, anchor: string): boolean {
  return content.includes(anchor.trim())
}

export default function InternalLinkStep({
  article,
  onInternalLinksChange,
  onBack,
  onNext,
}: InternalLinkStepProps) {
  const [selectedUrl, setSelectedUrl] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')
  const [anchorInput, setAnchorInput] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const links = article.internalLinks ?? []

  const addFromBank = (url: string, label: string) => {
    setSelectedUrl(url)
    setSelectedLabel(label)
    setCustomUrl('')
  }

  const handleAddLink = () => {
    const url = customUrl.trim() || selectedUrl
    const bankLabel = LINK_BANK_USEFUL.find((x) => x.url === url)?.label ?? LINK_BANK_CASE.find((x) => x.url === url)?.label ?? ''
    const label = selectedLabel || bankLabel
    const anchor = anchorInput.trim()
    if (!url || !anchor) return
    onInternalLinksChange([...links, { anchorText: anchor, url, label }])
    setAnchorInput('')
    setSelectedUrl('')
    setSelectedLabel('')
    setCustomUrl('')
  }

  const removeLink = (index: number) => {
    onInternalLinksChange(links.filter((_, i) => i !== index))
  }

  const canAdd = (anchorInput.trim() && (selectedUrl || customUrl.trim())) as boolean
  const content = article.refinedContent || ''

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <StepIndicator currentStep={3} />

      <p className="text-sm text-[#64748B]">
        お役立ち情報や日本提携支援の事例ページへ回遊させるため、記事内のどの文言にリンクを張るか設定します。
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左: 記事プレビュー */}
        <div className="lg:col-span-3 space-y-3">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={16} className="text-[#1B2A4A]" />
              <span className="text-xs font-mono text-[#64748B] uppercase tracking-wider">
                推敲後の記事（リンクを張る箇所を確認）
              </span>
            </div>
            <div
              className="w-full h-80 px-3 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#1A1A2E] text-sm overflow-y-auto whitespace-pre-wrap"
              role="article"
            >
              {content || '（記事がありません）'}
            </div>
          </Card>
        </div>

        {/* 右: リンク候補と追加フォーム */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-2">お役立ち情報</h3>
            <ul className="space-y-1.5 mb-4">
              {LINK_BANK_USEFUL.map((item) => (
                <li key={item.url}>
                  <button
                    type="button"
                    onClick={() => addFromBank(item.url, item.label)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#1B2A4A] hover:bg-[#1B2A4A]/5 border border-transparent hover:border-[#E2E8F0] transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-2">日本提携支援の事例</h3>
            <ul className="space-y-1.5">
              {LINK_BANK_CASE.map((item) => (
                <li key={item.url}>
                  <button
                    type="button"
                    onClick={() => addFromBank(item.url, item.label)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#1B2A4A] hover:bg-[#1B2A4A]/5 border border-transparent hover:border-[#E2E8F0] transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3">リンクを1件追加</h3>
            <div className="space-y-3">
              {(selectedLabel || selectedUrl) && (
                <p className="text-xs text-[#64748B]">
                  選択中: <span className="font-medium text-[#1B2A4A]">{selectedLabel || selectedUrl}</span>
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  記事内のリンクを張る文言（コピー＆ペースト可）
                </label>
                <input
                  type="text"
                  value={anchorInput}
                  onChange={(e) => setAnchorInput(e.target.value)}
                  placeholder="例: M&Aの相談相手"
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]"
                />
                {anchorInput.trim() && (
                  <p className="mt-1 text-xs flex items-center gap-1">
                    {hasAnchorInContent(content, anchorInput) ? (
                      <>
                        <CheckCircle size={12} className="text-[#16A34A]" />
                        <span className="text-[#16A34A]">記事内にこの文言があります</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} className="text-[#DC2626]" />
                        <span className="text-[#DC2626]">記事内に見つかりません。文言を確認してください</span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">カスタムURL（任意）</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="上記以外のURLを直接入力"
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]"
                />
              </div>
              <Button
                type="button"
                variant="navy"
                size="sm"
                onClick={handleAddLink}
                disabled={!canAdd}
                className="w-full"
              >
                <Plus size={14} />
                このリンクを追加
              </Button>
            </div>
          </Card>

          {links.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-[#1A1A2E] mb-2">追加した内部リンク（{links.length}件）</h3>
              <ul className="space-y-2">
                {links.map((link, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-2 py-2 border-b border-[#E2E8F0] last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1A1A2E] truncate" title={link.anchorText}>
                        「{link.anchorText}」
                      </p>
                      <p className="text-xs text-[#64748B] truncate" title={link.url}>
                        → {link.label || link.url}
                      </p>
                      {!hasAnchorInContent(content, link.anchorText) && (
                        <p className="text-xs text-[#DC2626] flex items-center gap-1 mt-0.5">
                          <AlertCircle size={10} /> 記事内に見つかりません
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="flex-shrink-0 p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                      aria-label="削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-[#E2E8F0]">
        <Button variant="ghost" size="md" onClick={onBack}>
          <ArrowLeft size={16} />
          Gemini推敲に戻る
        </Button>
        <Button variant="primary" size="lg" onClick={onNext}>
          ④ 画像を生成する
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  )
}
