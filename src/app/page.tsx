'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { LeaderboardEntry } from '@/lib/schemas'

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [rounds, setRounds] = useState<Array<{id: string, name: string, round_number: number}>>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set())
  const [previousScores, setPreviousScores] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  // Auto-refresh effect - refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard()
    }, 15000) // Refresh every 15 seconds

    return () => clearInterval(interval)
  }, [])

  async function fetchLeaderboard() {
    try {
      const { data: participants } = await supabase
        .from('participants')
        .select('id, name')

      const { data: roundsData } = await supabase
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

      if (!participants || !roundsData || !scores) return

      setRounds(roundsData)

      const leaderboardData: LeaderboardEntry[] = participants.map(participant => {
        const participantScores = scores.filter(s => s.participant_id === participant.id)
        const total_points = participantScores.reduce((sum, score) => sum + score.points, 0)
        
        // Find the highest round number that exists
        const maxRoundNumber = roundsData.length > 0 ? Math.max(...roundsData.map(r => r.round_number)) : 0
        const latestRound = roundsData.find(r => r.round_number === maxRoundNumber)
        const latestRoundScore = participantScores.find(s => s.round_id === latestRound?.id)
        const latest_round_points = latestRoundScore?.points || null

        // Create scores array with all rounds (including missing ones as 0)
        const allRoundScores = roundsData.map(round => {
          const score = participantScores.find(s => s.round_id === round.id)
          return {
            round_id: round.id,
            round_name: round.name || `Round ${round.round_number}`,
            round_number: round.round_number,
            points: score?.points || 0
          }
        })

        return {
          id: participant.id,
          name: participant.name,
          total_points,
          latest_round_points,
          scores: allRoundScores
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

      // Check for updated scores (only if we have previous data)
      const newRecentlyUpdated = new Set<string>()
      const newScoresMap = new Map<string, number>()
      
      leaderboardData.forEach(entry => {
        entry.scores.forEach(score => {
          const scoreKey = `${entry.id}-${score.round_id}`
          newScoresMap.set(scoreKey, score.points)
          
          // Only check for changes if we have previous data (not on first load)
          if (previousScores.size > 0) {
            const previousScore = previousScores.get(scoreKey)
            if (previousScore !== undefined && previousScore !== score.points) {
              newRecentlyUpdated.add(scoreKey)
              // Also add total points key for highlighting total
              newRecentlyUpdated.add(`${entry.id}-total`)
              console.log(`Score changed for ${scoreKey}: ${previousScore} → ${score.points}`)
            }
          }
        })
      })

      setLeaderboard(leaderboardData)
      setLastRefresh(new Date())
      
      // Only update highlights if we found changes
      if (newRecentlyUpdated.size > 0) {
        setRecentlyUpdated(newRecentlyUpdated)
        console.log('Recently updated scores:', Array.from(newRecentlyUpdated))
      }
      
      setPreviousScores(newScoresMap)
      
      // Clear highlights after 5 seconds
      if (newRecentlyUpdated.size > 0) {
        setTimeout(() => {
          setRecentlyUpdated(new Set())
        }, 5000)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const maxRoundNumber = rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) : 0

  return (
    <div className="h-screen bg-gray-900 flex flex-col p-4 md:p-8 overflow-hidden">
      <div className="w-full mx-auto flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div className="inline-block bg-gray-200 px-6 py-3 rounded-sm shadow-lg transform -rotate-1">
            <h1 className="text-2xl md:text-4xl font-mono tracking-wider font-bold text-gray-900 uppercase">
              Trijnieku Turniirs
            </h1>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-lg">No participants yet</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col rounded-lg overflow-hidden bg-gray-200/90 backdrop-blur-sm">
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse h-full">
                <thead className="bg-gray-200 border-b border-gray-300">
                  <tr>
                    <th className="px-4 py-4 text-left text-red-600 font-bold uppercase tracking-wider w-24">Vieta</th>
                    <th className="px-4 py-4 text-left text-red-600 font-bold uppercase tracking-wider sticky left-0 bg-gray-200 min-w-[200px]">Vārds</th>
                    {rounds.map((round, index) => (
                      <th key={round.id} className={`px-4 py-4 text-center text-red-600 font-bold uppercase tracking-wider min-w-[100px] ${index === 0 ? 'border-l border-gray-400' : ''} ${index === rounds.length - 1 ? 'border-r border-gray-400' : ''}`}>
                        {round.name || round.round_number}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-center text-red-600 font-bold uppercase tracking-wider min-w-[100px]">Punkti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300/50">
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.id} className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'} hover:bg-white transition-colors`}>
                      <td className="px-4 py-6">
                        <span className="text-5xl font-bold text-red-600 font-mono">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-6 sticky left-0 bg-inherit">
                        <Link 
                          href={`/p/${entry.id}`}
                          className="text-gray-800 font-medium text-lg uppercase tracking-wide hover:text-red-600 transition-colors block truncate"
                          title={entry.name}
                        >
                          {entry.name.toUpperCase()}
                        </Link>
                      </td>
                      {rounds.map((round, index) => {
                        const roundScore = entry.scores.find(s => s.round_id === round.id)
                        const points = roundScore?.points
                        const hasScore = roundScore !== undefined
                        const isLatest = round.round_number === maxRoundNumber
                        const scoreKey = `${entry.id}-${round.id}`
                        const isRecentlyUpdated = recentlyUpdated.has(scoreKey)
                        
                        let bgClass = ''
                        if (isRecentlyUpdated) {
                          bgClass = 'bg-green-200/70'
                        } else if (isLatest) {
                          bgClass = 'bg-red-100/30'
                        }
                        
                        return (
                          <td key={round.id} className={`px-4 py-6 text-center ${index === 0 ? 'border-l border-gray-400' : ''} ${index === rounds.length - 1 ? 'border-r border-gray-400' : ''} ${bgClass} transition-colors duration-1000`}>
                            <div className="flex flex-col items-center gap-2">
                              <span className={`text-2xl font-medium font-mono ${isRecentlyUpdated ? 'text-green-800 font-bold' : isLatest ? 'text-red-700 font-bold' : 'text-gray-800'}`}>
                                {hasScore ? points : '0'}
                              </span>
                            </div>
                          </td>
                        )
                      })}
                      <td className={`px-4 py-6 text-center ${recentlyUpdated.has(`${entry.id}-total`) ? 'bg-green-200/70' : ''} transition-colors duration-1000`}>
                        <span className={`text-3xl font-bold font-mono ${recentlyUpdated.has(`${entry.id}-total`) ? 'text-green-800' : 'text-gray-900'}`}>
                          {entry.total_points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex justify-end">
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400 font-mono">
                  Atjaunots: {lastRefresh.toLocaleTimeString('lv-LV', { hour12: false })}
                </span>
                {recentlyUpdated.size > 0 && (
                  <span className="text-xs text-green-400 font-mono animate-pulse">
                    ● {recentlyUpdated.size} izmaiņas
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Bottom cards image - fixed at bottom */}
        <div className="mt-4 text-center">
          <img 
            src="/assets/cards_bottom.png" 
            alt="Cards Bottom" 
            className="mx-auto max-w-full h-16 md:h-20 object-contain opacity-80"
          />
        </div>
      </div>
    </div>
  )
}
