const BASE = '/api'

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Team
export const getTeam         = (date) => req('GET', `/team?date=${date}`)
export const createMember    = (data) => req('POST', '/team', data)
export const updateMember    = (id, data) => req('PUT', `/team/${id}`, data)
export const deleteMember    = (id) => req('DELETE', `/team/${id}`)

// Work Orders
export const getWorkOrders      = (date) => req('GET', `/work-orders?date=${date}`)
export const createWorkOrder    = (data) => req('POST', '/work-orders', data)
export const updateWorkOrder    = (id, data) => req('PUT', `/work-orders/${id}`, data)
export const assignWorkOrder    = (id, assignedTo) => req('PUT', `/work-orders/${id}/assign`, { assignedTo })
export const setStatus          = (id, status) => req('PUT', `/work-orders/${id}/status`, { status })
export const confirmWorkOrder   = (id) => req('PUT', `/work-orders/${id}/confirm`)
export const dismissWorkOrder   = (id) => req('PUT', `/work-orders/${id}/dismiss`)
export const appendNote         = (id, text, author) => req('PUT', `/work-orders/${id}/notes`, { text, author })
export const setPriorityRank    = (id, priority_rank, priority_reason) => req('PUT', `/work-orders/${id}/priority-rank`, { priority_rank, priority_reason })
export const deleteWorkOrder    = (id) => req('DELETE', `/work-orders/${id}`)

// Assets
export const getAssets    = () => req('GET', '/assets')
export const createAsset  = (data) => req('POST', '/assets', data)
export const updateAsset  = (id, data) => req('PUT', `/assets/${id}`, data)
export const deleteAsset  = (id) => req('DELETE', `/assets/${id}`)

// DVIR
export const getDVIR               = (status) => req('GET', `/dvir${status ? `?status=${status}` : ''}`)
export const createDVIR            = (data) => req('POST', '/dvir', data)
export const dismissDVIR           = (id) => req('PUT', `/dvir/${id}/dismiss`)
export const dvirCreateWorkOrder   = (id, body) => req('POST', `/dvir/${id}/create-work-order`, body)

// Fault Codes
export const getFaultCodes             = (status) => req('GET', `/fault-codes${status ? `?status=${status}` : ''}`)
export const createFaultCode           = (data) => req('POST', '/fault-codes', data)
export const dismissFaultCode          = (id) => req('PUT', `/fault-codes/${id}/dismiss`)
export const faultCreateWorkOrder      = (id, body) => req('POST', `/fault-codes/${id}/create-work-order`, body)

// PM Schedules
export const getPMSchedules          = () => req('GET', '/pm-schedules')
export const createPMSchedule        = (data) => req('POST', '/pm-schedules', data)
export const updatePMSchedule        = (id, data) => req('PUT', `/pm-schedules/${id}`, data)
export const deletePMSchedule        = (id) => req('DELETE', `/pm-schedules/${id}`)
export const pmCreateWorkOrder       = (id, body) => req('POST', `/pm-schedules/${id}/create-work-order`, body)
export const completePMSchedule      = (id) => req('PUT', `/pm-schedules/${id}/complete`)

// Unified List
export const getUnifiedList = (date) => req('GET', `/unified-list?date=${date}`)
