'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { LeaderboardEntry } from '@/lib/schemas'

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  async function fetchLeaderboard() {
    try {
      const { data: participants } = await supabase
        .from('participants')
        .select('id, name')

      const { data: rounds } = await supabase
        .from('rounds')
        .select('*')
        .order('round_number')

      const { data: scores } = await supabase
        .from('scores')
        .select(`
          participant_id,
          round_id,
          points,
          rounds!inner(name, round_number)
        `)

      if (!participants || !rounds || !scores) return

      const leaderboardData: LeaderboardEntry[] = participants.map(participant => {
        const participantScores = scores.filter(s => s.participant_id === participant.id)
        const total_points = participantScores.reduce((sum, score) => sum + score.points, 0)
        
        const latestRound = rounds[rounds.length - 1]
        const latestRoundScore = participantScores.find(s => s.round_id === latestRound?.id)
        const latest_round_points = latestRoundScore?.points || null

        return {
          id: participant.id,
          name: participant.name,
          total_points,
          latest_round_points,
          scores: participantScores.map(score => ({
            round_id: score.round_id,
            round_name: (score.rounds as any).name,
            round_number: (score.rounds as any).round_number,
            points: score.points
          }))
        }
      })

      leaderboardData.sort((a, b) => {
        if (a.total_points !== b.total_points) {
          return b.total_points - a.total_points
        }
        if (a.latest_round_points !== b.latest_round_points) {
          return (b.latest_round_points || 0) - (a.latest_round_points || 0)
        }
        return a.name.localeCompare(b.name)
      })

      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">TURNIIC</h1>
          <p className="text-black">Tournament Leaderboard</p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-black text-lg">No participants yet</p>
          </div>
        ) : (
          <div className="bg-white border border-black rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-red-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-white font-semibold">Rank</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Name</th>
                    <th className="px-4 py-3 text-right text-white font-semibold">Total Points</th>
                    <th className="px-4 py-3 text-right text-white font-semibold hidden sm:table-cell">Latest Round</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-black font-semibold">#{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link 
                          href={`/p/${entry.id}`}
                          className="text-black hover:text-red-600 hover:underline font-medium"
                        >
                          {entry.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-black font-semibold">
                        {entry.total_points}
                      </td>
                      <td className="px-4 py-3 text-right text-black hidden sm:table-cell">
                        {entry.latest_round_points || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
