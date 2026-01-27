'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { LeaderboardEntry } from '@/lib/schemas'
import { leaderboardStyles as styles } from '@/lib/leaderboard-styles'

// Configurable update interval in milliseconds (1000ms = 1 second)
const UPDATE_INTERVAL_MS = 1000

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [rounds, setRounds] = useState<Array<{id: string, name: string, round_number: number}>>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set())
  const [rankChanged, setRankChanged] = useState<Set<string>>(new Set())
  const [rankDowngraded, setRankDowngraded] = useState<Set<string>>(new Set())
  const [rankImproved, setRankImproved] = useState<Set<string>>(new Set())
  const [scoreUpdates, setScoreUpdates] = useState<Array<{name: string, participantId: string}>>([])
  
  // Use refs to track previous values so interval callback has access to current state
  const previousScoresRef = useRef<Map<string, number>>(new Map())
  const previousRanksRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  // Auto-refresh effect
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard()
    }, UPDATE_INTERVAL_MS)

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

      // Check for updated scores and rank changes (only if we have previous data)
      const newRecentlyUpdated = new Set<string>()
      const newScoresMap = new Map<string, number>()
      const newRanksMap = new Map<string, number>()
      const newRankChanged = new Set<string>()
      const newRankDowngraded = new Set<string>()
      const newRankImproved = new Set<string>()
      const updatedParticipants = new Set<string>()
      
      leaderboardData.forEach((entry, index) => {
        const currentRank = index + 1
        newRanksMap.set(entry.id, currentRank)
        
        // Check for rank changes
        if (previousRanksRef.current.size > 0) {
          const previousRank = previousRanksRef.current.get(entry.id)
          if (previousRank !== undefined && previousRank !== currentRank) {
            newRankChanged.add(entry.id)
            console.log(`Rank changed for ${entry.name}: ${previousRank} → ${currentRank}`)
            
            // Track rank downgrades (higher rank number = worse position)
            if (currentRank > previousRank) {
              newRankDowngraded.add(entry.id)
              console.log(`⬇️ Rank downgraded for ${entry.name}: #${previousRank} → #${currentRank}`)
            }
            // Track rank improvements (lower rank number = better position)
            else if (currentRank < previousRank) {
              newRankImproved.add(entry.id)
              console.log(`⬆️ Rank improved for ${entry.name}: #${previousRank} → #${currentRank}`)
            }
          }
        }
        
        entry.scores.forEach(score => {
          const scoreKey = `${entry.id}-${score.round_id}`
          newScoresMap.set(scoreKey, score.points)
          
          // Only check for changes if we have previous data (not on first load)
          if (previousScoresRef.current.size > 0) {
            const previousScore = previousScoresRef.current.get(scoreKey)
            if (previousScore !== undefined && previousScore !== score.points) {
              newRecentlyUpdated.add(scoreKey)
              // Also add total points key for highlighting total
              newRecentlyUpdated.add(`${entry.id}-total`)
              // Track this participant as having an update
              updatedParticipants.add(entry.id)
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
      
      // Update rank changes
      if (newRankChanged.size > 0) {
        setRankChanged(newRankChanged)
        console.log('Rank changes:', Array.from(newRankChanged))
      }
      
      // Update rank downgrades
      if (newRankDowngraded.size > 0) {
        setRankDowngraded(newRankDowngraded)
        console.log('Rank downgrades:', Array.from(newRankDowngraded))
        
        // Clear downgrade highlights after 3 seconds
        setTimeout(() => {
          setRankDowngraded(new Set())
        }, 3000)
      }
      
      // Update rank improvements
      if (newRankImproved.size > 0) {
        setRankImproved(newRankImproved)
        console.log('Rank improvements:', Array.from(newRankImproved))
        
        // Clear improvement highlights after 3 seconds
        setTimeout(() => {
          setRankImproved(new Set())
        }, 3000)
      }
      
      // Update score change notifications
      if (updatedParticipants.size > 0) {
        const updates = Array.from(updatedParticipants).map(participantId => {
          const participant = leaderboardData.find(p => p.id === participantId)
          return {
            name: participant?.name || '',
            participantId
          }
        })
        setScoreUpdates(updates)
        console.log('📊 SCORE UPDATES DETECTED:', updates)
        
        // Clear notifications after 5 seconds
        setTimeout(() => {
          console.log('Clearing score update notifications')
          setScoreUpdates([])
        }, 5000)
      } else if (previousScoresRef.current.size > 0) {
        console.log('No score updates detected this refresh')
      }
      
      // Update refs with new values
      previousScoresRef.current = newScoresMap
      previousRanksRef.current = newRanksMap
      
      // Clear highlights after 3 seconds
      if (newRecentlyUpdated.size > 0) {
        setTimeout(() => {
          setRecentlyUpdated(new Set())
        }, 3000)
      }
      
      // Clear rank change highlights after 3 seconds
      if (newRankChanged.size > 0) {
        setTimeout(() => {
          setRankChanged(new Set())
        }, 3000)
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
      {/* Score update notifications */}
      {scoreUpdates.length > 0 && (
        <div className={styles.notification.container}>
          {scoreUpdates.map((update, index) => (
            <div 
              key={`${update.participantId}-${index}`}
              className={`${styles.notification.item.background} ${styles.notification.item.text} ${styles.notification.item.padding} ${styles.notification.item.borderRadius} ${styles.notification.item.shadow} ${styles.notification.item.fontSize} ${styles.notification.item.fontWeight} ${styles.notification.item.animation} ${styles.notification.item.transition}`}
            >
              📊 {update.name.toUpperCase()} - Rezultāts Atjaunināts!
            </div>
          ))}
        </div>
      )}
      
      <div className="w-full mx-auto flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-center gap-0 mb-3 flex-shrink-0">
          {[...Array(23)].map((_, i) => (
            <img 
              key={`left-${i}`}
              src="/assets/cards_bottom.png" 
              alt={`Cards Left ${i + 1}`}
              className={`max-w-full ${styles.bottomImage.height} object-contain ${styles.bottomImage.opacity}`}
            />
          ))}
          <div className={`inline-block ${styles.title.container.background} ${styles.title.container.padding} ${styles.title.container.borderRadius} ${styles.title.container.shadow} transform ${styles.title.container.rotation}`}>
            <h1 className={`${styles.title.text.size} ${styles.title.text.font} ${styles.title.text.tracking} ${styles.title.text.weight} ${styles.title.text.color} ${styles.title.text.transform}`}>
              Trijnieku Turniirs
            </h1>
          </div>
          {[...Array(23)].map((_, i) => (
            <img 
              key={`right-${i}`}
              src="/assets/cards_bottom.png" 
              alt={`Cards Right ${i + 1}`}
              className={`max-w-full ${styles.bottomImage.height} object-contain ${styles.bottomImage.opacity}`}
            />
          ))}
        </div>

        {leaderboard.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className={`${styles.emptyState.textColor} ${styles.emptyState.textSize}`}>No participants yet</p>
          </div>
        ) : (
          <div className={`flex-1 flex flex-col ${styles.tableContainer.borderRadius} overflow-hidden ${styles.tableContainer.background} ${styles.tableContainer.backdropBlur}`}>
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse h-full">
                <thead className={`${styles.tableHeader.background} ${styles.tableHeader.border} ${styles.tableHeader.sticky}`}>
                  <tr>
                    <th className={`${styles.tableHeader.cell.padding} text-center ${styles.tableHeader.cell.textColor} ${styles.tableHeader.cell.textSize} ${styles.tableHeader.cell.fontWeight} ${styles.tableHeader.cell.transform} ${styles.tableHeader.cell.tracking} ${styles.tableHeader.cell.minWidth.rank}`}>Vieta</th>
                    <th className={`${styles.tableHeader.cell.padding} text-left ${styles.tableHeader.cell.textColor} ${styles.tableHeader.cell.textSize} ${styles.tableHeader.cell.fontWeight} ${styles.tableHeader.cell.transform} ${styles.tableHeader.cell.tracking} sticky left-0 ${styles.tableHeader.background} ${styles.tableHeader.cell.minWidth.name}`}>Vārds</th>
                    {rounds.map((round, index) => (
                      <th key={round.id} className={`${styles.tableHeader.cell.padding} text-center ${styles.tableHeader.cell.textColor} ${styles.tableHeader.cell.textSize} ${styles.tableHeader.cell.fontWeight} ${styles.tableHeader.cell.transform} ${styles.tableHeader.cell.tracking} ${styles.tableHeader.cell.minWidth.round} ${index === 0 ? styles.roundBorder.left : ''} ${index === rounds.length - 1 ? styles.roundBorder.right : ''}`}>
                        {round.name || round.round_number}
                      </th>
                    ))}
                    <th className={`${styles.tableHeader.cell.padding} text-center ${styles.tableHeader.cell.textColor} ${styles.tableHeader.cell.textSize} ${styles.tableHeader.cell.fontWeight} ${styles.tableHeader.cell.transform} ${styles.tableHeader.cell.tracking} ${styles.tableHeader.cell.minWidth.total}`}>Punkti</th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody.divider}>
                  {leaderboard.map((entry, index) => {
                    const isTop3 = styles.highlighting.enabled && index < styles.highlighting.topCount
                    const isBottom3 = styles.highlighting.enabled && index >= leaderboard.length - styles.highlighting.bottomCount
                    
                    const rowBgClass = index % 2 === 0 ? styles.tableBody.row.even : styles.tableBody.row.odd
                    
                    const highlightTextClass = isTop3 ? `${styles.highlighting.top3Text.fontWeight} ${styles.highlighting.top3Text.textSize || ''}` : 
                                              isBottom3 ? `${styles.highlighting.bottom3Text.fontWeight} ${styles.highlighting.bottom3Text.textSize || ''}` : ''
                    
                    // Only apply highlighting if this participant's score was actually updated
                    const hadScoreUpdate = recentlyUpdated.has(`${entry.id}-total`)
                    const isDowngraded = rankDowngraded.has(entry.id) && hadScoreUpdate
                    const isImproved = rankImproved.has(entry.id) && hadScoreUpdate
                    
                    // Determine background and text color for name cell
                    let nameBgClass = ''
                    let nameTextColor = styles.participantName.textColor
                    if (isDowngraded) {
                      nameBgClass = styles.participantName.downgraded.background
                      nameTextColor = styles.participantName.downgraded.textColor
                    } else if (isImproved) {
                      nameBgClass = styles.participantName.improved.background
                      nameTextColor = styles.participantName.improved.textColor
                    } else {
                      // Use row background when no rank change
                      nameBgClass = rowBgClass
                    }
                    
                    return (
                    <tr key={entry.id} className={`${rowBgClass} ${styles.tableBody.row.hover} ${styles.tableBody.row.transition}`}>
                      <td className={`${styles.tableBody.cell.padding} text-center`}>
                        <span className={`${styles.rank.textSize} ${styles.rank.fontWeight} ${styles.rank.textColor} ${styles.rank.font} ${highlightTextClass}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className={`${styles.tableBody.cell.padding} sticky left-0 ${nameBgClass} transition-all duration-[3000ms] ease-out`}>
                        <span 
                          className={`${nameTextColor} ${styles.participantName.fontWeight} ${styles.participantName.textSize} ${styles.participantName.transform} ${styles.participantName.tracking} block whitespace-nowrap ${highlightTextClass} transition-all duration-[3000ms] ease-out`}
                          title={entry.name}
                        >
                          {entry.name.toUpperCase()}
                        </span>
                      </td>
                      {rounds.map((round, index) => {
                        const roundScore = entry.scores.find(s => s.round_id === round.id)
                        const points = roundScore?.points
                        const hasScore = roundScore !== undefined
                        const isLatest = round.round_number === maxRoundNumber
                        const scoreKey = `${entry.id}-${round.id}`
                        const isRecentlyUpdated = recentlyUpdated.has(scoreKey)
                        
                        let bgClass = rowBgClass // Default to row background
                        let textClass = `${styles.score.regular.textSize} ${styles.score.regular.fontWeight} ${styles.score.regular.font} ${styles.score.regular.textColor}`
                        
                        if (isRecentlyUpdated) {
                          // Apply rank change styling to updated scores
                          if (isDowngraded) {
                            bgClass = styles.participantName.downgraded.background
                            textClass = `${styles.score.updated.textSize} ${styles.score.updated.fontWeight} ${styles.score.updated.font} ${styles.participantName.downgraded.textColor}`
                          } else if (isImproved) {
                            bgClass = styles.participantName.improved.background
                            textClass = `${styles.score.updated.textSize} ${styles.score.updated.fontWeight} ${styles.score.updated.font} ${styles.participantName.improved.textColor}`
                          } else {
                            bgClass = styles.score.updated.background
                            textClass = `${styles.score.updated.textSize} ${styles.score.updated.fontWeight} ${styles.score.updated.font} ${styles.score.updated.textColor}`
                          }
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
                      <td className={`${styles.tableBody.cell.padding} text-center ${isDowngraded ? styles.participantName.downgraded.background : isImproved ? styles.participantName.improved.background : recentlyUpdated.has(`${entry.id}-total`) ? styles.totalPoints.updatedBackground : rowBgClass} ${styles.totalPoints.transition}`}>
                        <span className={`${styles.totalPoints.textSize} ${styles.totalPoints.fontWeight} ${styles.totalPoints.font} ${isDowngraded ? styles.participantName.downgraded.textColor : isImproved ? styles.participantName.improved.textColor : recentlyUpdated.has(`${entry.id}-total`) ? styles.totalPoints.updatedColor : styles.totalPoints.textColor} ${highlightTextClass}`}>
                          {entry.total_points}
                        </span>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
