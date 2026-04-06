'use client'

import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="h-screen flex flex-col justify-center px-4 gap-8">
      <div className="absolute top-4 right-4">
        <Link
          href="/"
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          Tabula
        </Link>
      </div>
      <div className="h-48">
        <Link
          href="/admin/participants"
          className="bg-white rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center h-full"
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-red-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-black">Dalībnieki</h3>
          </div>
        </Link>
      </div>

      <div className="h-48">
        <Link
          href="/admin/leaderboards"
          className="bg-white rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center h-full"
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-red-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-black">Tabulas</h3>
          </div>
        </Link>
      </div>
    </div>
  )
}
