import { useState, useEffect, useCallback } from 'react'
import * as api from '../api.js'

export function useAssets() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const data = await api.getAssets()
      setAssets(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (data) => {
    const created = await api.createAsset(data)
    setAssets(prev => [...prev, created])
    return created
  }
  const update = async (id, data) => {
    const updated = await api.updateAsset(id, data)
    setAssets(prev => prev.map(a => a.id === id ? updated : a))
    return updated
  }
  const remove = async (id) => {
    await api.deleteAsset(id)
    setAssets(prev => prev.filter(a => a.id !== id))
  }

  return { assets, loading, create, update, remove, refresh: fetch }
}
