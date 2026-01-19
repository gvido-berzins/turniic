'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { scoreSchema, type Participant, type Round, type Score } from '@/lib/schemas'
import { z } from 'zod'

type ScoreEntry = {
  participant: Participant
  score: Score | null
  points: number
}

export default function ScoresAdmin() {
  const params = useParams()
  const roundId = params.roundId as string
  const [round, setRound] = useState<Round | null>(null)
  const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (roundId) {
      fetchData()
    }
  }, [roundId])

  async function fetchData() {
    try {
      const [roundResult, participantsResult, scoresResult] = await Promise.all([
        supabase.from('rounds').select('*').eq('id', roundId).single(),
        supabase.from('participants').select('*').order('name'),
        supabase.from('scores').select('*').eq('round_id', roundId)
      ])

      if (roundResult.error || !roundResult.data) {
        console.error('Round not found')
        return
      }

      const participants = participantsResult.data || []
      const scores = scoresResult.data || []

      const entries: ScoreEntry[] = participants.map(participant => {
        const existingScore = scores.find(s => s.participant_id === participant.id)
        return {
          participant,
          score: existingScore || null,
          points: existingScore?.points || 0
        }
      })

      setRound(roundResult.data)
      setScoreEntries(entries)
    } catch (error) {
      console.error('Error fetching data:', error)
      setErrors(['Failed to load data'])
    } finally {
      setLoading(false)
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
            validationErrors.push(`${entry.participant.name}: ${error.errors[0].message}`)
          }
        }
      }

      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        return
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('scores')
          .upsert(update, { onConflict: 'participant_id,round_id' })

        if (error) throw error
      }

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
            href="/admin/rounds"
            className="text-red-600 hover:underline"
          >
            Back to Rounds
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-black mb-1">
            Round {round.round_number}: {round.name}
          </h2>
          <p className="text-black mb-2">Enter scores for all participants</p>
          <Link 
            href="/admin/rounds"
            className="text-red-600 hover:underline"
          >
            ← Back to Rounds
          </Link>
        </div>
        <button
          onClick={saveScores}
          disabled={!hasChanges || saving}
          className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save All Scores'}
        </button>
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
        <div className="bg-white border border-black rounded-lg overflow-hidden">
          <div className="bg-red-600 px-4 py-3 flex justify-between items-center">
            <h3 className="text-white font-semibold">Score Entry</h3>
            <span className="text-white text-sm">Total: {totalPoints} points</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-black font-semibold sticky left-0 bg-gray-100">
                    Participant
                  </th>
                  <th className="px-4 py-3 text-center text-black font-semibold min-w-[150px]">
                    Points
                  </th>
                  <th className="px-4 py-3 text-right text-black font-semibold">
                    Current Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {scoreEntries.map((entry, index) => (
                  <tr key={entry.participant.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-black font-medium sticky left-0 bg-inherit border-r border-gray-200">
                      {entry.participant.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        value={entry.points}
                        onChange={(e) => updateScore(entry.participant.id, parseInt(e.target.value) || 0)}
                        className="w-24 border border-black rounded px-3 py-2 text-center text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                        step="1"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-black">
                      <ParticipantTotal participantId={entry.participant.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-200">
            <span className="text-black font-medium">
              {scoreEntries.length} participants
            </span>
            <button
              onClick={saveScores}
              disabled={!hasChanges || saving}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ParticipantTotal({ participantId }: { participantId: string }) {
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    fetchTotal()
  }, [participantId])

  async function fetchTotal() {
    try {
      const { data: scores } = await supabase
        .from('scores')
        .select('points')
        .eq('participant_id', participantId)

      const totalPoints = scores?.reduce((sum, score) => sum + score.points, 0) || 0
      setTotal(totalPoints)
    } catch (error) {
      console.error('Error fetching total:', error)
    }
  }

  if (total === null) {
    return <span className="text-gray-400">-</span>
  }

  return <span>{total}</span>
}