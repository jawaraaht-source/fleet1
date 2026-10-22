import { useState, useEffect, useCallback } from 'react'
import * as api from '../api.js'

export function useWorkOrders(planDate) {
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const data = await api.getWorkOrders(planDate)
      setWorkOrders(data)
    } finally {
      setLoading(false)
    }
  }, [planDate])

  useEffect(() => { fetch() }, [fetch])

  const assign = async (id, assignedTo) => {
    const updated = await api.assignWorkOrder(id, assignedTo)
    setWorkOrders(prev => prev.map(w => w.id === id ? updated : w))
  }

  const updateStatus = async (id, status) => {
    const updated = await api.setStatus(id, status)
    setWorkOrders(prev => prev.map(w => w.id === id ? updated : w))
  }

  const create = async (data) => {
    const created = await api.createWorkOrder({ ...data, plan_date: planDate })
    setWorkOrders(prev => [...prev, created])
  }

  const update = async (id, data) => {
    const updated = await api.updateWorkOrder(id, data)
    setWorkOrders(prev => prev.map(w => w.id === id ? updated : w))
  }

  const remove = async (id) => {
    await api.deleteWorkOrder(id)
    setWorkOrders(prev => prev.filter(w => w.id !== id))
  }

  return { workOrders, loading, assign, updateStatus, create, update, remove, refresh: fetch }
}
