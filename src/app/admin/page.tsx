'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminPage() {
  const [resetting, setResetting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  async function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }

    setResetting(true)
    const supabase = createClient()

    try {
      // Delete in order due to foreign keys
      await supabase.from('scores').delete().neq('id', '')
      await supabase.from('rounds').delete().neq('id', '')
      await supabase.from('participants').delete().neq('id', '')
      await supabase.from('leaderboards').delete().neq('id', '')
      alert('All data has been deleted.')
    } catch (error) {
      console.error('Error resetting data:', error)
      alert('Failed to reset data.')
    } finally {
      setResetting(false)
      setConfirmReset(false)
    }
  }

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

      <div className="mt-4">
        {confirmReset ? (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-center">
            <p className="text-red-800 font-medium mb-3">Delete ALL data? This cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {resetting ? 'Deleting...' : 'Yes, delete everything'}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="bg-gray-200 hover:bg-gray-300 text-black px-6 py-2 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleReset}
            className="w-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 py-3 rounded-lg transition-colors text-sm font-medium border border-gray-200 hover:border-red-300"
          >
            Reset All Data
          </button>
        )}
      </div>
    </div>
  )
}