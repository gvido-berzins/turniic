'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { leaderboardSchema, type Leaderboard } from '@/lib/schemas'
import { z } from 'zod'

export default function LeaderboardsAdmin() {
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLeaderboard, setEditingLeaderboard] = useState<Leaderboard | null>(null)
  const [formData, setFormData] = useState({ name: '', refresh_interval_ms: 1000 })
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [leaderboardStats, setLeaderboardStats] = useState<Map<string, { roundCount: number; participantCount: number }>>(new Map())
  const supabase = createClient()

  useEffect(() => {
    fetchLeaderboards()
  }, [])

  async function fetchLeaderboards() {
    try {
      const { data } = await supabase
        .from('leaderboards')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        setLeaderboards(data)
        // Fetch stats for each leaderboard
        const stats = new Map<string, { roundCount: number; participantCount: number }>()
        for (const lb of data) {
          const { data: rounds } = await supabase
            .from('rounds')
            .select('id')
            .eq('leaderboard_id', lb.id!)

          const roundIds = rounds?.map(r => r.id) || []
          let participantIds = new Set<string>()
          if (roundIds.length > 0) {
            const { data: scores } = await supabase
              .from('scores')
              .select('participant_id')
              .in('round_id', roundIds)
            scores?.forEach(s => participantIds.add(s.participant_id))
          }

          stats.set(lb.id!, {
            roundCount: roundIds.length,
            participantCount: participantIds.size,
          })
        }
        setLeaderboardStats(stats)
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error)
    } finally {
      setLoading(false)
    }
  }

  function openForm(leaderboard?: Leaderboard) {
    setEditingLeaderboard(leaderboard || null)
    setFormData({
      name: leaderboard?.name || '',
      refresh_interval_ms: leaderboard?.refresh_interval_ms || 1000,
    })
    setShowForm(true)
    setErrors([])
  }

  function closeForm() {
    setShowForm(false)
    setEditingLeaderboard(null)
    setFormData({ name: '', refresh_interval_ms: 1000 })
    setErrors([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrors([])

    try {
      const validatedData = leaderboardSchema.omit({ id: true, created_at: true, updated_at: true }).parse(formData)

      if (editingLeaderboard) {
        const { error } = await supabase
          .from('leaderboards')
          .update(validatedData)
          .eq('id', editingLeaderboard.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('leaderboards')
          .insert([validatedData])

        if (error) throw error
      }

      await fetchLeaderboards()
      closeForm()
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(error.issues.map(e => e.message))
      } else {
        console.error('Error saving leaderboard:', error)
        setErrors(['Failed to save leaderboard'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(leaderboard: Leaderboard) {
    if (!confirm(`Delete "${leaderboard.name}"? This will also delete all rounds and scores in this leaderboard.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('leaderboards')
        .delete()
        .eq('id', leaderboard.id)

      if (error) throw error

      await fetchLeaderboards()
    } catch (error) {
      console.error('Error deleting leaderboard:', error)
      alert('Failed to delete leaderboard')
    }
  }

  function formatDate(dateStr: string | undefined) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('lv-LV', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 text-center">
        <div className="text-black">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-black mb-2">Tabulas</h2>
          <Link
            href="/admin"
            className="text-red-600 hover:underline"
          >
            &larr; Atpaka&#316;
          </Link>
        </div>
        <button
          onClick={() => openForm()}
          className="bg-red-600 text-white w-12 h-12 rounded-full font-medium hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg"
          title="Jauna tabula"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {leaderboards.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-black text-lg mb-4">Nav tabulu</p>
          <button
            onClick={() => openForm()}
            className="bg-red-600 text-white w-16 h-16 rounded-full font-medium hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg mx-auto"
            title="Izveidot pirmo tabulu"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboards.map((leaderboard) => {
            const stats = leaderboardStats.get(leaderboard.id!)
            return (
              <div key={leaderboard.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/admin/leaderboards/${leaderboard.id}`}
                    className="flex-1 hover:text-red-600 transition-colors"
                  >
                    <div>
                      <h3 className="text-black font-bold text-lg">{leaderboard.name}</h3>
                      <div className="flex gap-4 text-sm text-gray-500 mt-1">
                        <span>{formatDate(leaderboard.created_at)}</span>
                        {stats && (
                          <>
                            <span>{stats.roundCount} raundi</span>
                            <span>{stats.participantCount} dal&#299;bnieki</span>
                          </>
                        )}
                        <span>{(leaderboard.refresh_interval_ms! / 1000).toFixed(1)}s atjauno&#353;ana</span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openForm(leaderboard)}
                      className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
                      title="Redi&#291;&#275;t"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(leaderboard)}
                      className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
                      title="Dz&#275;st"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-black mb-4">
              {editingLeaderboard ? 'Redi&#291;&#275;t tabulu' : 'Jauna tabula'}
            </h3>

            {errors.length > 0 && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <ul>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-black font-medium mb-2">
                  Nosaukums
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-black rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Ievadiet tabulas nosaukumu"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="refresh_interval_ms" className="block text-black font-medium mb-2">
                  Atjaunošanas intervāls (sekundēs)
                </label>
                <input
                  type="number"
                  id="refresh_interval_ms"
                  value={formData.refresh_interval_ms / 1000}
                  onChange={(e) => {
                    const seconds = parseFloat(e.target.value) || 1
                    setFormData({ ...formData, refresh_interval_ms: Math.round(seconds * 1000) })
                  }}
                  className="w-full border border-black rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                  min="0.5"
                  max="60"
                  step="0.5"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Cik bieži tabula atjauninās datus (0.5 - 60 sekundes)
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeForm}
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
                  {submitting ? 'Saglabā...' : editingLeaderboard ? 'Atjaunināt' : 'Izveidot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
