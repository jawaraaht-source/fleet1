export const PRIORITIES = [
  { id: 'critical', label: 'Critical', color: '#E53E3E', bg: '#FFF5F5' },
  { id: 'high',     label: 'High',     color: '#DD6B20', bg: '#FFFAF0' },
  { id: 'medium',   label: 'Medium',   color: '#D69E2E', bg: '#FFFFF0' },
  { id: 'low',      label: 'Low',      color: '#38A169', bg: '#F0FFF4' },
]

export const STATUSES = [
  { id: 'unassigned',  label: 'Unassigned',  color: '#718096', bg: '#EDF2F7' },
  { id: 'in-progress', label: 'In Progress', color: '#3182CE', bg: '#EBF8FF' },
  { id: 'completed',   label: 'Completed',   color: '#38A169', bg: '#F0FFF4' },
]

export const SKILLS = [
  'Diesel', 'Brakes', 'Tires', 'Electrical', 'Low Voltage', 'PLC',
  'HVAC', 'Refrigeration', 'Welding', 'Pipefitting', 'Plumbing',
  'Carpentry', 'Painting', 'General', 'Fire Safety',
]

export const ASSET_TYPES = [
  { id: 'vehicle',   label: 'Vehicle' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'trailer',   label: 'Trailer' },
]

export const SOURCE_TYPES = {
  manual:     { label: 'Manual',          color: '#718096' },
  dvir:       { label: 'DVIR Defect',     color: '#D69E2E' },
  fault_code: { label: 'Fault Code',      color: '#E53E3E' },
  pm:         { label: 'Preventive PM',   color: '#3182CE' },
}

export const SEVERITY_LEVELS = [
  { id: 'critical', label: 'Critical' },
  { id: 'high',     label: 'High' },
  { id: 'medium',   label: 'Medium' },
  { id: 'low',      label: 'Low' },
]

export const AVATAR_COLORS = [
  '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
]

/**
 * Canonical technician roster — single source of truth.
 * Used by the Day Plan view and the assignment modal.
 * Matches the seeded team members in the database.
 */
export const ROSTER = [
  {
    name: 'James Okafor', role: 'Diesel Mechanic',
    skills: ['Diesel', 'General'],
    avatar_color: '#3182CE', shift_start: '07:00', shift_end: '16:00',
  },
  {
    name: 'Marcus Rivera', role: 'HVAC Technician',
    skills: ['HVAC', 'Refrigeration'],
    avatar_color: '#38A169', shift_start: '08:00', shift_end: '17:00',
  },
  {
    name: 'Priya Nair', role: 'Fleet Technician',
    skills: ['Brakes', 'Tires', 'General'],
    avatar_color: '#D69E2E', shift_start: '07:00', shift_end: '16:00',
  },
  {
    name: 'Sarah Chen', role: 'Electrician',
    skills: ['Electrical', 'Low Voltage'],
    avatar_color: '#805AD5', shift_start: '08:00', shift_end: '17:00',
  },
]

export function getPriority(id) {
  return PRIORITIES.find(p => p.id === id) || PRIORITIES[2]
}

export function getStatus(id) {
  return STATUSES.find(s => s.id === id) || STATUSES[0]
}

export function getSourceType(id) {
  return SOURCE_TYPES[id] || SOURCE_TYPES.manual
}
