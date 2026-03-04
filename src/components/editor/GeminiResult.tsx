 'use client'

 import { useState, useEffect } from 'react'
 import { ArticleData, ProcessingState } from '@/lib/types'
 import StepIndicator from './StepIndicator'
 import Button from '@/components/ui/Button'
 import GeminiLoadingCard from './GeminiLoadingCard'
 import { ArrowLeft, ArrowRight, ClipboardCopy, Check, CheckCircle } from 'lucide-react'

 interface GeminiResultProps {
   article: ArticleData
   geminiStatus: ProcessingState
   geminiError?: string | null
   onRefinedContentChange: (content: string) => void
   onBack: () => void
   onNext: () => void
   onRetry?: () => void
 }

 export default function GeminiResult({
   article,
   geminiStatus,
   geminiError,
   onRefinedContentChange,
   onBack,
   onNext,
   onRetry,
 }: GeminiResultProps) {
   const [copied, setCopied] = useState(false)
   const [showToast, setShowToast] = useState(false)

   useEffect(() => {
     if (geminiStatus === 'success') {
       setShowToast(true)
       const t = setTimeout(() => setShowToast(false), 2500)
       return () => clearTimeout(t)
     }
   }, [geminiStatus])

   const handleCopy = async () => {
     await navigator.clipboard.writeText(article.refinedContent)
     setCopied(true)
     setTimeout(() => setCopied(false), 2000)
   }

   return (
     <div className="max-w-5xl mx-auto px-4 py-6">
       <div className="flex items-start gap-8">
         {/* メインコンテンツ */}
         <div className="flex-1 space-y-5">
           {/* ローディング */}
           {geminiStatus === 'loading' && (
             <div className="max-w-2xl">
               <GeminiLoadingCard />
             </div>
           )}

           {/* エラー */}
           {geminiStatus === 'error' && geminiError && (
             <div className="rounded-lg bg-red-50 border border-red-200 px-5 py-4 space-y-3">
               <p className="text-sm font-medium text-red-800">推敲できませんでした</p>
               <p className="text-sm text-red-700">{geminiError}</p>
               {onRetry && (
                 <Button variant="primary" size="md" onClick={onRetry}>
                   再度推敲する
                 </Button>
               )}
             </div>
           )}

           {/* 2カラム */}
           {(geminiStatus === 'success' || geminiStatus === 'error') && (
             <div className="grid grid-cols-2 gap-0 rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
               {/* 左: 元の記事 */}
               <div className="flex flex-col bg-[#F8FAFC]">
                 <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E2E8F0]">
                   <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                     元の記事
                   </span>
                   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E2E8F0] text-[#64748B]">
                     入力済み
                   </span>
                 </div>
                 <textarea
                   readOnly
                   value={article.originalContent}
                   className="
                     flex-1 px-5 py-4
                     bg-[#F8FAFC] text-[#64748B] text-sm resize-none
                     min-h-[500px] max-h-[600px]
                     focus:outline-none
                   "
                 />
               </div>

               {/* 区切り線（将来拡張用に残しつつ非表示） */}
               <div className="col-span-2 hidden" />

               {/* 右: 改善後 */}
               <div className="flex flex-col bg-white border-l border-[#E2E8F0]">
                 <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0]">
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-semibold text-[#16A34A] uppercase tracking-wider">
                       Gemini 改善後
                     </span>
                     <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                       AI推敲済み
                     </span>
                   </div>
                   <button
                     onClick={handleCopy}
                     className="
                       inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       border border-[#E2E8F0] text-[#1B2A4A]
                       hover:bg-[#1B2A4A] hover:text-white hover:border-[#1B2A4A]
                       transition-colors
                     "
                   >
                     {copied ? (
                       <>
                         <Check size={13} className="text-green-500" />
                         コピー済み
                       </>
                     ) : (
                       <>
                         <ClipboardCopy size={13} />
                         全文コピー
                       </>
                     )}
                   </button>
                 </div>
                 <textarea
                   value={article.refinedContent}
                   onChange={e => onRefinedContentChange(e.target.value)}
                   className="
                     flex-1 px-5 py-4
                     bg-white text-[#1A1A2E] text-sm resize-none
                     min-h-[500px] max-h-[600px]
                     focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1B2A4A]/20
                     transition-all
                   "
                 />
               </div>
             </div>
           )}

           <div className="flex justify-between pt-2">
             <Button variant="ghost" size="md" onClick={onBack}>
               <ArrowLeft size={16} />
               記事を修正する
             </Button>
             <Button
               variant="primary"
               size="lg"
               onClick={onNext}
               disabled={geminiStatus !== 'success' || !article.refinedContent.trim()}
             >
               ③ 内部リンクを設定する
               <ArrowRight size={18} />
             </Button>
           </div>
         </div>

         {/* 右側の縦ステップインジケーター */}
         <div className="w-40 flex-shrink-0">
           <StepIndicator currentStep={2} />
         </div>
       </div>

       {/* トースト通知 */}
       <div
         className={`
           fixed bottom-6 right-6 z-50
           flex items-center gap-2 px-4 py-3
           bg-[#16A34A] text-white text-sm font-medium rounded-xl shadow-lg
           transition-all duration-300
           ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}
         `}
       >
         <CheckCircle size={16} />
         Geminiによる推敲が完了しました
       </div>
     </div>
   )
 }

