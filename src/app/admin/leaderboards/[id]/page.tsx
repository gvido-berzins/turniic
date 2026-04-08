'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { leaderboardSchema, roundSchema, type Leaderboard, type Round } from '@/lib/schemas'
import { z } from 'zod'

export default function LeaderboardDetail() {
  const params = useParams()
  const leaderboardId = params.id as string
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [showRoundForm, setShowRoundForm] = useState(false)
  const [editingRound, setEditingRound] = useState<Round | null>(null)
  const [roundFormData, setRoundFormData] = useState({ name: '', round_number: 1 })
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  // Settings form
  const [settingsData, setSettingsData] = useState({ name: '', refresh_interval_ms: 1000 })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (leaderboardId) {
      fetchData()
    }
  }, [leaderboardId])

  async function fetchData() {
    try {
      const [lbResult, roundsResult] = await Promise.all([
        supabase.from('leaderboards').select('*').eq('id', leaderboardId).single(),
        supabase.from('rounds').select('*').eq('leaderboard_id', leaderboardId).order('round_number', { ascending: false }),
      ])

      if (lbResult.data) {
        setLeaderboard(lbResult.data)
        setSettingsData({
          name: lbResult.data.name,
          refresh_interval_ms: lbResult.data.refresh_interval_ms,
        })
      }
      if (roundsResult.data) {
        setRounds(roundsResult.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    setErrors([])

    try {
      const validatedData = leaderboardSchema.omit({ id: true, created_at: true, updated_at: true }).parse(settingsData)

      const { error } = await supabase
        .from('leaderboards')
        .update(validatedData)
        .eq('id', leaderboardId)

      if (error) throw error

      setLeaderboard(prev => prev ? { ...prev, ...validatedData } : null)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(error.issues.map(e => e.message))
      } else {
        console.error('Error saving settings:', error)
        setErrors(['Failed to save settings'])
      }
    } finally {
      setSavingSettings(false)
    }
  }

  function openRoundForm(round?: Round) {
    setEditingRound(round || null)
    setRoundFormData({
      name: round?.name || '',
      round_number: round?.round_number || (rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) + 1 : 1),
    })
    setShowRoundForm(true)
    setErrors([])
  }

  function closeRoundForm() {
    setShowRoundForm(false)
    setEditingRound(null)
    setRoundFormData({ name: '', round_number: 1 })
    setErrors([])
  }

  async function handleRoundSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrors([])

    try {
      const validatedData = roundSchema.omit({ id: true, created_at: true, leaderboard_id: true }).parse(roundFormData)

      if (editingRound) {
        const { error } = await supabase
          .from('rounds')
          .update(validatedData)
          .eq('id', editingRound.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('rounds')
          .insert([{ ...validatedData, leaderboard_id: leaderboardId }])

        if (error) throw error
      }

      await fetchData()
      closeRoundForm()
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(error.issues.map(e => e.message))
      } else {
        console.error('Error saving round:', error)
        setErrors(['Failed to save round'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteRound(round: Round) {
    if (!confirm(`Delete "${round.name || `Round ${round.round_number}`}"? This will also delete all scores for this round.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('rounds')
        .delete()
        .eq('id', round.id)

      if (error) throw error

      await fetchData()
    } catch (error) {
      console.error('Error deleting round:', error)
      alert('Failed to delete round')
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 text-center">
        <div className="text-black">Loading...</div>
      </div>
    )
  }

  if (!leaderboard) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-black mb-4">Tabula nav atrasta</h2>
          <Link href={`/admin?leaderboard=${leaderboardId}`} className="text-red-600 hover:underline">
            ← Atpakaļ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="mb-6">
        <Link
          href={`/admin?leaderboard=${leaderboardId}`}
          className="text-red-600 hover:underline"
        >
          ← Atpakaļ
        </Link>
        <h2 className="text-2xl font-bold text-black mt-2">{leaderboard.name}</h2>
      </div>

      {/* Settings Section */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
        <h3 className="text-lg font-bold text-black mb-4">Iestatījumi</h3>

        {errors.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={saveSettings}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="settings-name" className="block text-black font-medium mb-2">
                Nosaukums
              </label>
              <input
                type="text"
                id="settings-name"
                value={settingsData.name}
                onChange={(e) => setSettingsData({ ...settingsData, name: e.target.value })}
                className="w-full border border-black rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                required
              />
            </div>
            <div>
              <label htmlFor="settings-refresh" className="block text-black font-medium mb-2">
                Atjaunošanas intervāls (sekundēs)
              </label>
              <input
                type="number"
                id="settings-refresh"
                value={settingsData.refresh_interval_ms / 1000}
                onChange={(e) => {
                  const seconds = parseFloat(e.target.value) || 1
                  setSettingsData({ ...settingsData, refresh_interval_ms: Math.round(seconds * 1000) })
                }}
                className="w-full border border-black rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                min="0.5"
                max="60"
                step="0.5"
              />
              <p className="text-sm text-gray-500 mt-1">
                Cik bieži publiskā tabula atjauninās datus
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={savingSettings}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {savingSettings ? 'Saglabā...' : settingsSaved ? 'Saglabāts!' : 'Saglabāt iestatījumus'}
          </button>
        </form>
      </div>

      {/* Rounds Section */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-black">Raundi</h3>
        <button
          onClick={() => openRoundForm()}
          className="bg-red-600 text-white w-12 h-12 rounded-full font-medium hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg"
          title="Pievienot raundi"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {rounds.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-black text-lg mb-4">Nav raundi</p>
          <button
            onClick={() => openRoundForm()}
            className="bg-red-600 text-white w-16 h-16 rounded-full font-medium hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg mx-auto"
            title="Pievienot pirmo raundi"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rounds.map((round) => (
            <Link
              key={round.id}
              href={`/admin/scores/${round.id}`}
              className="bg-white rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors block shadow-sm"
            >
              <div className="flex items-center gap-4">
                <span className="text-black font-bold text-xl w-8">
                  {round.round_number}
                </span>
                <span className="text-black font-medium text-lg">
                  {round.name || `Raunds ${round.round_number}`}
                </span>
              </div>
              <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openRoundForm(round)
                  }}
                  className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
                  title="Rediģēt"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDeleteRound(round)
                  }}
                  className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
                  title="Dzēst"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Round Form Modal */}
      {showRoundForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-black mb-4">
              {editingRound ? 'Rediģēt raundi' : 'Pievienot raundi'}
            </h3>

            <form onSubmit={handleRoundSubmit}>
              <div className="mb-4">
                <label htmlFor="round_number" className="block text-black font-medium mb-2">
                  Raunda numurs
                </label>
                <input
                  type="number"
                  id="round_number"
                  value={roundFormData.round_number}
                  onChange={(e) => setRoundFormData({ ...roundFormData, round_number: parseInt(e.target.value) || 1 })}
                  className="w-full border border-black rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                  min="1"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="round_name" className="block text-black font-medium mb-2">
                  Raunda nosaukums (Neobligāti)
                </label>
                <input
                  type="text"
                  id="round_name"
                  value={roundFormData.name}
                  onChange={(e) => setRoundFormData({ ...roundFormData, name: e.target.value })}
                  className="w-full border border-black rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Ievadiet raunda nosaukumu (neobligāti)"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeRoundForm}
                  disabled={submitting}
                  className="px-4 py-2 border border-black rounded-lg text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Atcelt
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saglabā...' : editingRound ? 'Atjaunināt' : 'Pievienot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
