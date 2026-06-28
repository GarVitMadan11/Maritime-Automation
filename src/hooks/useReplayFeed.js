import { useEffect, useRef, useState } from 'react'

/**
 * useReplayFeed
 * Keeps the LiveFeed alive by cycling seed records to the top when idle.
 * Replay activates after `idleMs` (default 8s) of no manual ingestion.
 * A new record surfaces every `intervalMs` (default 4s).
 */
export function useReplayFeed(baseRecords, { idleMs = 8000, intervalMs = 4000 } = {}) {
  const [displayRecords, setDisplayRecords] = useState(baseRecords)
  const [isReplaying, setIsReplaying]       = useState(false)

  // Track the latest baseRecords length to detect manual ingest
  const lastIngestCount = useRef(baseRecords.length)
  const idleTimer        = useRef(null)
  const replayTimer      = useRef(null)
  const replayIndex      = useRef(0)

  const stopReplay = () => {
    clearInterval(replayTimer.current)
    replayTimer.current = null
    setIsReplaying(false)
  }

  const startReplay = () => {
    if (replayTimer.current) return // already running
    if (!baseRecords || baseRecords.length === 0) return // safety check
    setIsReplaying(true)
    replayTimer.current = setInterval(() => {
      setDisplayRecords(prev => {
        const pool = baseRecords
        const next = pool[replayIndex.current % pool.length]
        replayIndex.current += 1

        // Avoid exact duplicates at the top
        if (prev[0]?.id === next.id) return prev

        // Surface with a fresh timestamp to look live
        const liveRecord = {
          ...next,
          id: next.id + '-r' + replayIndex.current,
          ts: new Date().toISOString(),
        }
        return [liveRecord, ...prev.slice(0, 24)]
      })
    }, intervalMs)
  }

  const resetIdleTimer = () => {
    clearTimeout(idleTimer.current)
    stopReplay()
    idleTimer.current = setTimeout(startReplay, idleMs)
  }

  // When baseRecords changes (manual ingest), reset the idle timer
  useEffect(() => {
    if (baseRecords.length !== lastIngestCount.current) {
      lastIngestCount.current = baseRecords.length
      setDisplayRecords(baseRecords)
      resetIdleTimer()
    }
  }, [baseRecords]) // eslint-disable-line react-hooks/exhaustive-deps

  // Start the idle countdown on mount
  useEffect(() => {
    resetIdleTimer()
    return () => {
      clearTimeout(idleTimer.current)
      clearInterval(replayTimer.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { displayRecords, isReplaying }
}
