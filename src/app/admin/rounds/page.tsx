'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { roundSchema, type Round } from '@/lib/schemas'
import { z } from 'zod'

export default function RoundsAdmin() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRound, setEditingRound] = useState<Round | null>(null)
  const [formData, setFormData] = useState({ name: '', round_number: 1 })
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchRounds()
  }, [])

  async function fetchRounds() {
    try {
      const { data } = await supabase
        .from('rounds')
        .select('*')
        .order('round_number')

      if (data) {
        setRounds(data)
      }
    } catch (error) {
      console.error('Error fetching rounds:', error)
    } finally {
      setLoading(false)
    }
  }

  function openForm(round?: Round) {
    setEditingRound(round || null)
    setFormData({ 
      name: round?.name || '', 
      round_number: round?.round_number || (rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) + 1 : 1)
    })
    setShowForm(true)
    setErrors([])
  }

  function closeForm() {
    setShowForm(false)
    setEditingRound(null)
    setFormData({ name: '', round_number: 1 })
    setErrors([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrors([])

    try {
      const validatedData = roundSchema.omit({ id: true, created_at: true }).parse(formData)

      if (editingRound) {
        const { error } = await supabase
          .from('rounds')
          .update(validatedData)
          .eq('id', editingRound.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('rounds')
          .insert([validatedData])

        if (error) throw error
      }

      await fetchRounds()
      closeForm()
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(error.errors.map(e => e.message))
      } else {
        console.error('Error saving round:', error)
        setErrors(['Failed to save round'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(round: Round) {
    if (!confirm(`Are you sure you want to delete "${round.name}"? This will also delete all scores for this round.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('rounds')
        .delete()
        .eq('id', round.id)

      if (error) throw error

      await fetchRounds()
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

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-black mb-2">Rounds</h2>
          <Link 
            href="/admin"
            className="text-red-600 hover:underline"
          >
            ← Back to Admin
          </Link>
        </div>
        <button
          onClick={() => openForm()}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          Add Round
        </button>
      </div>

      {rounds.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-black text-lg mb-4">No rounds yet</p>
          <button
            onClick={() => openForm()}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Add First Round
          </button>
        </div>
      ) : (
        <div className="bg-white border border-black rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-red-600">
              <tr>
                <th className="px-4 py-3 text-left text-white font-semibold">Round #</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Name</th>
                <th className="px-4 py-3 text-right text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((round, index) => (
                <tr key={round.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-black font-medium">
                    {round.round_number}
                  </td>
                  <td className="px-4 py-3 text-black">
                    {round.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/admin/scores/${round.id}`}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Scores
                      </Link>
                      <button
                        onClick={() => openForm(round)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(round)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-black mb-4">
              {editingRound ? 'Edit Round' : 'Add Round'}
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
                <label htmlFor="round_number" className="block text-black font-medium mb-2">
                  Round Number
                </label>
                <input
                  type="number"
                  id="round_number"
                  value={formData.round_number}
                  onChange={(e) => setFormData({ ...formData, round_number: parseInt(e.target.value) || 1 })}
                  className="w-full border border-black rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                  min="1"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="name" className="block text-black font-medium mb-2">
                  Round Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-black rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Enter round name"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="px-4 py-2 border border-black rounded-lg text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingRound ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}