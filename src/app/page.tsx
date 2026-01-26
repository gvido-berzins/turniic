'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { LeaderboardEntry } from '@/lib/schemas'
import { leaderboardStyles as styles } from '@/lib/leaderboard-styles'

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
      <div className={`min-h-screen ${styles.loading.background} flex items-center justify-center`}>
        <div className={styles.loading.textColor}>Loading...</div>
      </div>
    )
  }

  const maxRoundNumber = rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) : 0

  return (
    <div className={`h-screen ${styles.page.background} flex flex-col ${styles.page.padding} overflow-hidden`}>
      <div className="w-full mx-auto flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div className={`inline-block ${styles.title.container.background} ${styles.title.container.padding} ${styles.title.container.borderRadius} ${styles.title.container.shadow} transform ${styles.title.container.rotation}`}>
            <h1 className={`${styles.title.text.size} ${styles.title.text.font} ${styles.title.text.tracking} ${styles.title.text.weight} ${styles.title.text.color} ${styles.title.text.transform}`}>
              Trijnieku Turniirs
            </h1>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className={`${styles.emptyState.textColor} ${styles.emptyState.textSize}`}>No participants yet</p>
          </div>
        ) : (
          <div className={`flex-1 flex flex-col ${styles.tableContainer.borderRadius} overflow-hidden ${styles.tableContainer.background} ${styles.tableContainer.backdropBlur}`}>
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse h-full">
                <thead className={`${styles.tableHeader.background} ${styles.tableHeader.border}`}>
                  <tr>
                    <th className={`${styles.tableHeader.cell.padding} text-left ${styles.tableHeader.cell.textColor} ${styles.tableHeader.cell.fontWeight} ${styles.tableHeader.cell.transform} ${styles.tableHeader.cell.tracking} ${styles.tableHeader.cell.minWidth.rank}`}>Vieta</th>
                    <th className={`${styles.tableHeader.cell.padding} text-left ${styles.tableHeader.cell.textColor} ${styles.tableHeader.cell.fontWeight} ${styles.tableHeader.cell.transform} ${styles.tableHeader.cell.tracking} sticky left-0 ${styles.tableHeader.background} ${styles.tableHeader.cell.minWidth.name}`}>Vārds</th>
                    {rounds.map((round, index) => (
                      <th key={round.id} className={`${styles.tableHeader.cell.padding} text-center ${styles.tableHeader.cell.textColor} ${styles.tableHeader.cell.fontWeight} ${styles.tableHeader.cell.transform} ${styles.tableHeader.cell.tracking} ${styles.tableHeader.cell.minWidth.round} ${index === 0 ? styles.roundBorder.left : ''} ${index === rounds.length - 1 ? styles.roundBorder.right : ''}`}>
                        {round.name || round.round_number}
                      </th>
                    ))}
                    <th className={`${styles.tableHeader.cell.padding} text-center ${styles.tableHeader.cell.textColor} ${styles.tableHeader.cell.fontWeight} ${styles.tableHeader.cell.transform} ${styles.tableHeader.cell.tracking} ${styles.tableHeader.cell.minWidth.total}`}>Punkti</th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody.divider}>
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.id} className={`${index % 2 === 0 ? styles.tableBody.row.even : styles.tableBody.row.odd} ${styles.tableBody.row.hover} ${styles.tableBody.row.transition}`}>
                      <td className={styles.tableBody.cell.padding}>
                        <span className={`${styles.rank.textSize} ${styles.rank.fontWeight} ${styles.rank.textColor} ${styles.rank.font}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className={`${styles.tableBody.cell.padding} sticky left-0 bg-inherit`}>
                        <Link 
                          href={`/p/${entry.id}`}
                          className={`${styles.participantName.textColor} ${styles.participantName.fontWeight} ${styles.participantName.textSize} ${styles.participantName.transform} ${styles.participantName.tracking} ${styles.participantName.hover} ${styles.participantName.transition} block truncate`}
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
                        let textClass = `${styles.score.regular.textSize} ${styles.score.regular.fontWeight} ${styles.score.regular.font} ${styles.score.regular.textColor}`
                        
                        if (isRecentlyUpdated) {
                          bgClass = styles.score.updated.background
                          textClass = `${styles.score.updated.textSize} ${styles.score.updated.fontWeight} ${styles.score.updated.font} ${styles.score.updated.textColor}`
                        } else if (isLatest) {
                          bgClass = styles.score.latest.background
                          textClass = `${styles.score.latest.textSize} ${styles.score.latest.fontWeight} ${styles.score.latest.font} ${styles.score.latest.textColor}`
                        }
                        
                        return (
                          <td key={round.id} className={`${styles.tableBody.cell.padding} text-center ${index === 0 ? styles.roundBorder.left : ''} ${index === rounds.length - 1 ? styles.roundBorder.right : ''} ${bgClass} ${styles.score.transition}`}>
                            <div className="flex flex-col items-center gap-2">
                              <span className={textClass}>
                                {hasScore ? points : '0'}
                              </span>
                            </div>
                          </td>
                        )
                      })}
                      <td className={`${styles.tableBody.cell.padding} text-center ${recentlyUpdated.has(`${entry.id}-total`) ? styles.totalPoints.updatedBackground : ''} ${styles.totalPoints.transition}`}>
                        <span className={`${styles.totalPoints.textSize} ${styles.totalPoints.fontWeight} ${styles.totalPoints.font} ${recentlyUpdated.has(`${entry.id}-total`) ? styles.totalPoints.updatedColor : styles.totalPoints.textColor}`}>
                          {entry.total_points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`${styles.footer.container.margin} flex justify-end`}>
              <div className={`flex items-center ${styles.footer.container.gap}`}>
                <span className={`${styles.footer.timestamp.textSize} ${styles.footer.timestamp.textColor} ${styles.footer.timestamp.font}`}>
                  Atjaunots: {lastRefresh.toLocaleTimeString('lv-LV', { hour12: false })}
                </span>
                {recentlyUpdated.size > 0 && (
                  <span className={`${styles.footer.updateIndicator.textSize} ${styles.footer.updateIndicator.textColor} ${styles.footer.updateIndicator.font} ${styles.footer.updateIndicator.animation}`}>
                    ● {recentlyUpdated.size} izmaiņas
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Bottom cards image - fixed at bottom */}
        <div className={`${styles.bottomImage.margin} text-center`}>
          <img 
            src="/assets/cards_bottom.png" 
            alt="Cards Bottom" 
            className={`mx-auto max-w-full ${styles.bottomImage.height} object-contain ${styles.bottomImage.opacity}`}
          />
        </div>
      </div>
    </div>
  )
}
