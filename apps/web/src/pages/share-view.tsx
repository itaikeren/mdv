import { useParams, Link } from 'react-router-dom'
import { useShareByToken } from '../hooks/use-shares'
import { Preview } from '../components/preview'
import logoSvg from '../../assets/mdv_logo.svg'

export function ShareView() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, error } = useShareByToken(token!)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading shared file...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Share not found</h1>
          <p className="text-slate-600 mb-6">
            This share link may have expired or been deleted.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Go to Markdown Viewer
          </Link>
        </div>
      </div>
    )
  }

  const { file, viewCount } = data

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <img src={logoSvg} alt="Markdown Viewer Logo" className="h-6 w-auto" />
                <span className="text-sm font-medium text-slate-900" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
                  Markdown Viewer
                </span>
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{file.name}</h1>
                <p className="text-xs text-slate-500">
                  Shared by {file.userId} • {viewCount} views
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-xs font-medium text-amber-900">Read-only</span>
              </div>
              <Link
                to="/"
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Create your own
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <Preview markdown={file.content} />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-12 text-center">
        <p className="text-sm text-slate-500 mb-4">
          Powered by{' '}
          <Link to="/" className="text-slate-900 hover:text-slate-700 font-medium" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
            Markdown Viewer
          </Link>
        </p>
        <p className="text-xs text-slate-400">
          Create, edit, and share beautiful markdown files
        </p>
      </footer>
    </div>
  )
}
