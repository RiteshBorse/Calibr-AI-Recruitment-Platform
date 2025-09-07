'use client'
import { useState, useEffect } from 'react'
import { fetchTestSession } from './actions'

export function useTestQuestions(sessionId: string | null) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }

    const loadQuestions = async () => {
      try {
        const result = await fetchTestSession(sessionId)
        if (result.success && result.data?.allQuestions) {
          setQuestions(result.data.allQuestions)
        } else {
          setError(result.error || 'Failed to load questions')
        }
      } catch (err) {
        setError('An unexpected error occurred')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [sessionId])

  return { questions, loading, error }
}