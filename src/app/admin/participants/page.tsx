'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { participantSchema, type Participant } from '@/lib/schemas'
import { z } from 'zod'

export default function ParticipantsAdmin() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [formData, setFormData] = useState({ name: '' })
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchParticipants()
  }, [])

  async function fetchParticipants() {
    try {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .order('name')

      if (data) {
        setParticipants(data)
      }
    } catch (error) {
      console.error('Error fetching participants:', error)
    } finally {
      setLoading(false)
    }
  }

  function openForm(participant?: Participant) {
    setEditingParticipant(participant || null)
    setFormData({ name: participant?.name || '' })
    setShowForm(true)
    setErrors([])
  }

  function closeForm() {
    setShowForm(false)
    setEditingParticipant(null)
    setFormData({ name: '' })
    setErrors([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrors([])

    try {
      const validatedData = participantSchema.omit({ id: true, created_at: true }).parse(formData)

      if (editingParticipant) {
        const { error } = await supabase
          .from('participants')
          .update(validatedData)
          .eq('id', editingParticipant.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('participants')
          .insert([validatedData])

        if (error) throw error
      }

      await fetchParticipants()
      closeForm()
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(error.errors.map(e => e.message))
      } else {
        console.error('Error saving participant:', error)
        setErrors(['Failed to save participant'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(participant: Participant) {
    if (!confirm(`Are you sure you want to delete ${participant.name}? This will also delete all their scores.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participant.id)

      if (error) throw error

      await fetchParticipants()
    } catch (error) {
      console.error('Error deleting participant:', error)
      alert('Failed to delete participant')
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
          <h2 className="text-2xl font-bold text-black mb-2">Participants</h2>
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
          Add Participant
        </button>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-black text-lg mb-4">No participants yet</p>
          <button
            onClick={() => openForm()}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Add First Participant
          </button>
        </div>
      ) : (
        <div className="bg-white border border-black rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-red-600">
              <tr>
                <th className="px-4 py-3 text-left text-white font-semibold">Name</th>
                <th className="px-4 py-3 text-right text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant, index) => (
                <tr key={participant.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-black font-medium">
                    {participant.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openForm(participant)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(participant)}
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
              {editingParticipant ? 'Edit Participant' : 'Add Participant'}
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
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-black rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Enter participant name"
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
                  {submitting ? 'Saving...' : editingParticipant ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}