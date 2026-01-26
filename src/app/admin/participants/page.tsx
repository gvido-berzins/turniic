'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
  const [nameFilter, setNameFilter] = useState('')
  const supabase = createClient()

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
        setErrors(error.issues.map(e => e.message))
      } else {
        console.error('Error saving participant:', error)
        setErrors(['Neizdevās saglabāt dalībnieku'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(participant: Participant) {
    if (!confirm(`Vai tiešām vēlaties dzēst ${participant.name}? Tas arī dzēsīs visus viņu rezultātus.`)) {
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
      alert('Neizdevās dzēst dalībnieku')
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
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-black mb-2">Dalībnieki</h2>
          <Link 
            href="/admin"
            className="text-red-600 hover:underline"
          >
            ← Atpakaļ
          </Link>
        </div>
        <button
          onClick={() => openForm()}
          className="bg-red-600 text-white w-12 h-12 rounded-full font-medium hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg"
          title="Pievienot dalībnieku"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Search Filter */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Meklēt dalībniekus..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full border border-black rounded-lg px-4 py-3 pr-10 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
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
            Rāda {participants.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase())).length} no {participants.length} dalībniekiem
          </p>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-black text-lg mb-4">Nav dalībnieku</p>
          <button
            onClick={() => openForm()}
            className="bg-red-600 text-white w-16 h-16 rounded-full font-medium hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg mx-auto"
            title="Pievienot pirmo dalībnieku"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {participants
            .filter(participant => 
              participant.name.toLowerCase().includes(nameFilter.toLowerCase())
            )
            .map((participant) => (
            <div key={participant.id} className="bg-white rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors shadow-sm">
              <span className="text-black font-medium text-lg">
                {participant.name}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => openForm(participant)}
                  className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors" title="Rediģēt"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(participant)}
                  className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors" title="Dzēst"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-black mb-4">
              {editingParticipant ? 'Rediģēt dalībnieku' : 'Pievienot dalībnieku'}
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
                  Vārds
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-black rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Ievadiet dalībnieka vārdu"
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
                  Atcelt
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saglabā...' : editingParticipant ? 'Atjaunināt' : 'Pievienot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}