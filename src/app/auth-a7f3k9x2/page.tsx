'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { leaderboardStyles as styles } from '@/lib/leaderboard-styles'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Pārbaudiet e-pastu!' })
        setEmail('')
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Notika kļūda' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${styles.page.background} p-4`}>
      <div className={`${styles.title.container.background} ${styles.title.container.borderRadius} ${styles.title.container.shadow} ${styles.title.container.rotation} p-8 w-full max-w-sm border border-gray-300`}>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className={`block ${styles.title.text.font} text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide`}>
              E-PASTA ADRESE
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="JUSU@EPASTS.LV"
              required
              className={`w-full px-4 py-3 bg-white text-black border border-gray-400 rounded-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition ${styles.title.text.font}`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gray-900 text-white py-3 rounded-sm ${styles.title.text.font} font-bold uppercase tracking-wider hover:bg-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed transition transform active:scale-[0.98] shadow-md`}
          >
            {loading ? 'SŪTA...' : 'SŪTĪT SAITI'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-6 p-4 rounded-sm ${styles.title.text.font} text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Bottom cards image */}
      <div className={`${styles.bottomImage.margin} text-center opacity-50`}>
        <img 
          src="/assets/cards_bottom.png" 
          alt="Cards Bottom" 
          className={`mx-auto ${styles.bottomImage.height} object-contain`}
        />
      </div>
    </div>
  )
}
