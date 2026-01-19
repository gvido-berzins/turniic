'use client'

import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-black mb-2">Tournament Management</h2>
        <p className="text-black">Manage participants, rounds, and scores</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/participants"
          className="bg-white border border-black rounded-lg p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-red-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">Participants</h3>
            <p className="text-black text-sm">Add, edit, or remove tournament participants</p>
          </div>
        </Link>

        <Link
          href="/admin/rounds"
          className="bg-white border border-black rounded-lg p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-red-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">Rounds</h3>
            <p className="text-black text-sm">Create and manage tournament rounds</p>
          </div>
        </Link>

        <div className="md:col-span-2 lg:col-span-1">
          <div className="bg-white border border-black rounded-lg p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Quick Score</h3>
              <p className="text-black text-sm mb-4">Go to a round to enter scores</p>
              <p className="text-black text-xs">Select a round from the Rounds page to enter scores for all participants</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-black mb-2">Quick Actions</h3>
        <div className="space-y-2">
          <Link 
            href="/"
            className="block w-full text-center bg-white border border-black rounded py-3 px-4 text-black hover:bg-gray-50 transition-colors"
          >
            View Public Leaderboard
          </Link>
        </div>
      </div>
    </div>
  )
}