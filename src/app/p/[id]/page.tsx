'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Participant, Round, Score } from '@/lib/schemas'

type ParticipantWithScores = {
  participant: Participant
  scores: Array<Score & { round: Round }>
  totalPoints: number
}

export default function ParticipantDetail() {
  const supabase = createClient()
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<ParticipantWithScores | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (id) {
      fetchParticipantDetail()
    }
  }, [id])

  async function fetchParticipantDetail() {
    try {
      const { data: participant } = await supabase
        .from('participants')
        .select('*')
        .eq('id', id)
        .single()

      if (!participant) {
        setNotFound(true)
        return
      }

      // Get rounds for the participant's leaderboard
      const { data: leaderboardRounds } = await supabase
        .from('rounds')
        .select('id')
        .eq('leaderboard_id', participant.leaderboard_id)

      const roundIds = leaderboardRounds?.map(r => r.id) || []

      let scoresWithRounds: Array<Score & { round: Round }> = []

      if (roundIds.length > 0) {
        const { data: scores } = await supabase
          .from('scores')
          .select(`
            *,
            rounds!inner(*)
          `)
          .eq('participant_id', id)
          .in('round_id', roundIds)

        scoresWithRounds = scores?.map(score => ({
          ...score,
          round: (score.rounds as any) as Round
        })) || []

        // Sort by round_number
        scoresWithRounds.sort((a, b) => (a.round.round_number ?? 0) - (b.round.round_number ?? 0))
      }

      const totalPoints = scoresWithRounds.reduce((sum, score) => sum + score.points, 0)

      setData({
        participant,
        scores: scoresWithRounds,
        totalPoints
      })
    } catch (error) {
      console.error('Error fetching participant detail:', error)
      setNotFound(true)
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

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-black mb-4">Participant Not Found</h1>
            <Link
              href="/"
              className="text-red-600 hover:underline"
            >
              Back to Leaderboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <Link
            href="/"
            className="text-red-600 hover:underline mb-4 inline-block"
          >
            &larr; Back to Leaderboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
            {data.participant.name}
          </h1>
          <p className="text-xl text-black">
            Total Points: <span className="font-bold">{data.totalPoints}</span>
          </p>

          {/* Leaderboard selector */}
        </div>

        {data.scores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-black text-lg">No scores recorded yet</p>
          </div>
        ) : (
          <div className="bg-white border border-black rounded-lg overflow-hidden">
            <div className="bg-red-600 px-4 py-3">
              <h2 className="text-white font-semibold text-lg">Round Scores</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-black font-semibold">Round</th>
                    <th className="px-4 py-3 text-left text-black font-semibold">Name</th>
                    <th className="px-4 py-3 text-right text-black font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.scores.map((score, index) => (
                    <tr key={score.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-black font-medium">
                        Round {score.round.round_number}
                      </td>
                      <td className="px-4 py-3 text-black">
                        {score.round.name}
                      </td>
                      <td className="px-4 py-3 text-right text-black font-semibold">
                        {score.points}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-red-50 border-t-2 border-red-200">
                    <td className="px-4 py-3 text-black font-bold" colSpan={2}>
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-black font-bold text-lg">
                      {data.totalPoints}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
