import { useState, useEffect, useCallback } from 'react'
import * as api from '../api.js'

export function useUnifiedList(planDate) {
  const [data, setData] = useState({ workOrders: [], dvirItems: [], faultItems: [], pmItems: [] })
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const result = await api.getUnifiedList(planDate)
      setData(result)
    } finally {
      setLoading(false)
    }
  }, [planDate])

  useEffect(() => { fetch() }, [fetch])

  const createWOFromDVIR = async (id) => {
    await api.dvirCreateWorkOrder(id)
    await fetch()
  }
  const createWOFromFault = async (id) => {
    await api.faultCreateWorkOrder(id)
    await fetch()
  }
  const createWOFromPM = async (id) => {
    await api.pmCreateWorkOrder(id)
    await fetch()
  }
  const dismissDVIR = async (id) => {
    await api.dismissDVIR(id)
    setData(prev => ({ ...prev, dvirItems: prev.dvirItems.filter(d => d.id !== id) }))
  }
  const dismissFault = async (id) => {
    await api.dismissFaultCode(id)
    setData(prev => ({ ...prev, faultItems: prev.faultItems.filter(f => f.id !== id) }))
  }
  const confirmWO = async (id) => {
    const updated = await api.confirmWorkOrder(id)
    setData(prev => ({ ...prev, workOrders: prev.workOrders.map(w => w.id === id ? updated : w) }))
    return updated
  }
  const dismissWO = async (id) => {
    await api.dismissWorkOrder(id)
    setData(prev => ({ ...prev, workOrders: prev.workOrders.filter(w => w.id !== id) }))
  }
  const updateWO = (updated) => {
    setData(prev => ({ ...prev, workOrders: prev.workOrders.map(w => w.id === updated.id ? updated : w) }))
  }

  return {
    ...data, loading, refresh: fetch,
    createWOFromDVIR, createWOFromFault, createWOFromPM,
    dismissDVIR, dismissFault, confirmWO, dismissWO, updateWO,
  }
}
