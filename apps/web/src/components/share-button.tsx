import { useState } from 'react'
import { useCreateShare, useFileShares, useDeleteShare } from '../hooks/use-shares'
import type { Share } from '@markdown-viewer/shared'

interface ShareButtonProps {
  fileId: string
  fileName: string
}

export function ShareButton({ fileId, fileName }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const createShare = useCreateShare()
  const { data: shares = [], isLoading } = useFileShares(isOpen ? fileId : null)
  const deleteShare = useDeleteShare()

  const handleCreateShare = () => {
    createShare.mutate({ fileId })
  }

  const handleCopyLink = (shareUrl: string, token: string) => {
    navigator.clipboard.writeText(shareUrl)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleDeleteShare = (shareId: string) => {
    if (confirm('Delete this share link? Anyone with the link will no longer be able to access this file.')) {
      deleteShare.mutate(shareId)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
        title="Share file"
      >
        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Share "{fileName}"</h2>
              <p className="text-sm text-slate-500 mt-1">
                Anyone with the link can view this file in read-only mode
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Create Share Button */}
          <button
            onClick={handleCreateShare}
            disabled={createShare.isPending}
            className="w-full px-4 py-2.5 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium mb-6"
          >
            {createShare.isPending ? 'Creating link...' : 'Create new share link'}
          </button>

          {/* Share Links List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Loading shares...</div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No active share links. Create one to get started!
              </div>
            ) : (
              <>
                <h3 className="text-sm font-medium text-slate-700 mb-3">Active share links</h3>
                {shares.map((share: Share) => {
                  const shareUrl = `${window.location.origin}/share/${share.shareToken}`
                  const isCopied = copiedToken === share.shareToken

                  return (
                    <div
                      key={share.id}
                      className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-slate-600 truncate">
                          {shareUrl}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Views: {share.viewCount} • Created {new Date(share.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyLink(shareUrl, share.shareToken)}
                        className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors flex-shrink-0"
                      >
                        {isCopied ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDeleteShare(share.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        title="Delete share link"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
