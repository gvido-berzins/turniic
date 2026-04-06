'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { scoreSchema, type Participant, type Round, type Score } from '@/lib/schemas'
import { z } from 'zod'

type ScoreEntry = {
  participant: Participant
  score: Score | null
  points: number
  totalPoints: number
}

export default function ScoresAdmin() {
  const params = useParams()
  const roundId = params.roundId as string
  const [round, setRound] = useState<(Round & { leaderboard_id?: string }) | null>(null)
  const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [nameFilter, setNameFilter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (roundId) {
      fetchData()
    }
  }, [roundId])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || hasChanges) return

    const interval = setInterval(() => {
      fetchDataSilently()
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, hasChanges, roundId])

  async function buildEntries(
    participants: Participant[],
    scores: Array<{ participant_id: string; round_id: string; points: number }>,
    allScores: Array<{ participant_id: string; points: number }>
  ): Promise<ScoreEntry[]> {
    const totalsByParticipant = new Map<string, number>()
    for (const s of allScores) {
      totalsByParticipant.set(s.participant_id, (totalsByParticipant.get(s.participant_id) || 0) + s.points)
    }

    return participants.map(participant => {
      const existingScore = scores.find(s => s.participant_id === participant.id)
      return {
        participant,
        score: existingScore || null,
        points: existingScore?.points ?? 0,
        totalPoints: totalsByParticipant.get(participant.id!) ?? 0
      }
    })
  }

  async function fetchData() {
    try {
      // Fetch round first to get leaderboard_id
      const roundResult = await supabase.from('rounds').select('*').eq('id', roundId).single()

      if (roundResult.error || !roundResult.data) {
        console.error('Round not found')
        return
      }

      const leaderboardId = roundResult.data.leaderboard_id

      const [participantsResult, scoresResult, allScoresResult] = await Promise.all([
        supabase.from('participants').select('*').eq('leaderboard_id', leaderboardId).order('name'),
        supabase.from('scores').select('participant_id, round_id, points').eq('round_id', roundId),
        supabase.from('scores').select('participant_id, points')
      ])

      const entries = await buildEntries(
        participantsResult.data || [],
        scoresResult.data || [],
        allScoresResult.data || []
      )

      setRound(roundResult.data)
      setScoreEntries(entries)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching data:', error)
      setErrors(['Failed to load data'])
    } finally {
      setLoading(false)
    }
  }

  async function fetchDataSilently() {
    try {
      const leaderboardId = round?.leaderboard_id
      const [participantsResult, scoresResult, allScoresResult] = await Promise.all([
        leaderboardId
          ? supabase.from('participants').select('*').eq('leaderboard_id', leaderboardId).order('name')
          : supabase.from('participants').select('*').order('name'),
        supabase.from('scores').select('participant_id, round_id, points').eq('round_id', roundId),
        supabase.from('scores').select('participant_id, points')
      ])

      const entries = await buildEntries(
        participantsResult.data || [],
        scoresResult.data || [],
        allScoresResult.data || []
      )

      setScoreEntries(entries)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }

  function updateScore(participantId: string, points: number) {
    setScoreEntries(prev => prev.map(entry => 
      entry.participant.id === participantId 
        ? { ...entry, points }
        : entry
    ))
    setHasChanges(true)
    setErrors([])
  }

  async function saveScores() {
    setSaving(true)
    setErrors([])

    try {
      const updates: Array<{ participant_id: string; round_id: string; points: number }> = []
      const validationErrors: string[] = []

      for (const entry of scoreEntries) {
        try {
          const validatedScore = scoreSchema.omit({ 
            id: true, 
            created_at: true, 
            updated_at: true 
          }).parse({
            participant_id: entry.participant.id,
            round_id: roundId,
            points: entry.points
          })
          updates.push(validatedScore)
        } catch (error) {
          if (error instanceof z.ZodError) {
            validationErrors.push(`${entry.participant.name}: ${error.issues[0].message}`)
          }
        }
      }

      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        return
      }

      const { error } = await supabase
        .from('scores')
        .upsert(updates, { onConflict: 'participant_id,round_id' })

      if (error) throw error

      await fetchData()
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving scores:', error)
      setErrors(['Failed to save scores'])
    } finally {
      setSaving(false)
    }
  }

  const totalPoints = scoreEntries.reduce((sum, entry) => sum + entry.points, 0)

  if (loading) {
    return (
      <div className="p-4 md:p-8 text-center">
        <div className="text-black">Loading...</div>
      </div>
    )
  }

  if (!round) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-black mb-4">Round Not Found</h2>
          <Link
            href="/admin/leaderboards"
            className="text-red-600 hover:underline"
          >
            Back to Leaderboards
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-black mb-1">
              {round.round_number}{round.name ? ` (${round.name})` : ''}
            </h2>
            <Link
              href={round.leaderboard_id ? `/admin/leaderboards/${round.leaderboard_id}` : '/admin/leaderboards'}
              className="text-red-600 hover:underline text-sm md:text-base"
            >
              &larr; Atpaka&#316;
            </Link>
          </div>
          <button
            onClick={saveScores}
            disabled={!hasChanges || saving}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full text-lg"
          >
            {saving ? 'Saglabā...' : 'Saglabāt'}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {hasChanges && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          You have unsaved changes. Click "Save All Scores" to save your changes.
        </div>
      )}

      {scoreEntries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-black text-lg mb-4">No participants found</p>
          <Link
            href="/admin/participants"
            className="text-red-600 hover:underline"
          >
            Add participants first
          </Link>
        </div>
      ) : (
        <div>
          {/* Search Filter */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="w-full border border-black rounded-lg px-3 py-2 pr-10 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <svg 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {nameFilter && (
              <p className="text-sm text-gray-600 mt-2">
                Showing {scoreEntries.filter(entry => entry.participant.name.toLowerCase().includes(nameFilter.toLowerCase())).length} of {scoreEntries.length} participants
              </p>
            )}
          </div>

          <div className="space-y-2">
            {scoreEntries
              .filter(entry => 
                entry.participant.name.toLowerCase().includes(nameFilter.toLowerCase())
              )
              .map((entry) => (
              <div key={entry.participant.id} className="bg-white rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="text-black font-medium text-lg">
                    {entry.participant.name}
                  </span>
                  <span className="text-gray-500 text-sm">
                    ({entry.totalPoints})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateScore(entry.participant.id!, entry.points * -1)}
                    className="w-10 h-10 border border-gray-300 rounded-lg text-black hover:bg-gray-100 transition-colors flex items-center justify-center font-bold text-lg"
                    title="Toggle positive/negative"
                  >
                    {entry.points >= 0 ? '+' : '−'}
                  </button>
                  <input
                    type="text"
                    value={Math.abs(entry.points)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0
                      updateScore(entry.participant.id!, entry.points < 0 ? -Math.abs(val) : Math.abs(val))
                    }}
                    onFocus={(e) => e.currentTarget.select()}
                    onClick={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur()
                        saveScores()
                      }
                    }}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center text-black focus:outline-none focus:ring-2 focus:ring-red-600 text-lg"
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

