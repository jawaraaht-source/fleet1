import { useState, useEffect, useCallback } from 'react'
import * as api from '../api.js'

export function useTeam(planDate) {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const data = await api.getTeam(planDate)
      setTeam(data)
    } finally {
      setLoading(false)
    }
  }, [planDate])

  useEffect(() => { fetch() }, [fetch])

  const create = async (data) => {
    const created = await api.createMember(data)
    setTeam(prev => [...prev, { ...created, assigned_count: 0, assigned_hours: 0 }])
  }

  const update = async (id, data) => {
    const updated = await api.updateMember(id, data)
    setTeam(prev => prev.map(m => m.id === id ? { ...updated, assigned_count: m.assigned_count, assigned_hours: m.assigned_hours } : m))
  }

  const remove = async (id) => {
    await api.deleteMember(id)
    setTeam(prev => prev.filter(m => m.id !== id))
  }

  return { team, loading, create, update, remove, refresh: fetch }
}
