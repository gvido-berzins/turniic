'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type LeaderboardOption = {
  id: string
  name: string
  is_default: boolean
}

export default function AdminPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [leaderboards, setLeaderboards] = useState<LeaderboardOption[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchLeaderboards()
  }, [])

  useEffect(() => {
    if (leaderboards.length > 0) {
      const paramId = searchParams.get('leaderboard')
      if (paramId && leaderboards.some(lb => lb.id === paramId)) {
        setSelectedId(paramId)
      } else if (!paramId) {
        const defaultLb = leaderboards.find(lb => lb.is_default) || leaderboards[0]
        setSelectedId(defaultLb.id)
      }
    }
  }, [leaderboards, searchParams])

  async function fetchLeaderboards() {
    try {
      const { data } = await supabase
        .from('leaderboards')
        .select('id, name, is_default')
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        setLeaderboards(data)
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLeaderboardChange(id: string) {
    setSelectedId(id)
    router.push(`/admin?leaderboard=${id}`)

    // Persist as default leaderboard for public display
    await supabase
      .from('leaderboards')
      .update({ is_default: false })
      .neq('id', id)
    await supabase
      .from('leaderboards')
      .update({ is_default: true })
      .eq('id', id)
  }

  return (
    <div className="h-screen flex flex-col justify-center px-4 gap-8">
      <div className="absolute top-4 right-4">
        <Link
          href={selectedId ? `/?leaderboard=${selectedId}` : '/'}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          Tabula
        </Link>
      </div>

      {/* Leaderboard selector */}
      <div>
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : leaderboards.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-500 mb-2">Nav tabulu</p>
            <Link
              href="/admin/leaderboards"
              className="text-red-600 hover:underline font-medium"
            >
              Izveidot tabulu
            </Link>
          </div>
        ) : (
          <div className="text-center">
            <select
              value={selectedId || ''}
              onChange={(e) => handleLeaderboardChange(e.target.value)}
              className="w-full border border-black rounded-lg px-4 py-3 text-black text-lg font-medium focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
            >
              {leaderboards.map((lb) => (
                <option key={lb.id} value={lb.id}>
                  {lb.name}
                </option>
              ))}
            </select>
            <Link
              href="/admin/leaderboards"
              className="text-red-600 hover:underline text-sm mt-2 inline-block"
            >
              Pārvaldīt tabulas
            </Link>
          </div>
        )}
      </div>

      <div className="h-48">
        {selectedId ? (
          <Link
            href={`/admin/participants?leaderboard=${selectedId}`}
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
        ) : (
          <div className="bg-gray-100 rounded-lg flex items-center justify-center h-full opacity-50">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-400 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-400">Dalībnieki</h3>
            </div>
          </div>
        )}
      </div>

      <div className="h-48">
        {selectedId ? (
          <Link
            href={`/admin/leaderboards/${selectedId}`}
            className="bg-white rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center h-full"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-red-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-black">Raundi</h3>
            </div>
          </Link>
        ) : (
          <div className="bg-gray-100 rounded-lg flex items-center justify-center h-full opacity-50">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-400 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-400">Raundi</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
