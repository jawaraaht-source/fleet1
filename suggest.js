const PRIORITY_SCORE = { critical: 100, high: 60, medium: 30, low: 10 }

const RISK_RULES = [
  { pattern: /brake|steering|tire|tyre/i,                    boost: 45, reason: 'Safety-critical system — vehicle must be taken out of service' },
  { pattern: /fault|alarm|failure|down|outage/i,             boost: 40, reason: 'Live fault — risk of breakdown or cascading damage' },
  { pattern: /fire|suppression|sprinkler/i,                  boost: 35, reason: 'Fire safety system — regulatory compliance required' },
  { pattern: /engine|transmission|drivetrain/i,              boost: 32, reason: 'Drivetrain fault — vehicle out-of-service risk' },
  { pattern: /compliance|inspection|annual|monthly|test/i,   boost: 30, reason: 'Compliance or scheduled inspection — regulatory deadline' },
  { pattern: /leak|water|flood|drain|standing/i,             boost: 28, reason: 'Fluid leak — environmental liability and equipment damage' },
  { pattern: /electrical|panel|circuit|breaker|power/i,      boost: 20, reason: 'Electrical fault — shock or fire risk if deferred' },
  { pattern: /oil|fluid|coolant|filter/i,                    boost: 15, reason: 'Routine fluid/filter — deferral compounds wear cost' },
  { pattern: /safety|hazard|slip|trip/i,                     boost: 25, reason: 'Safety/liability issue — injury risk if unaddressed' },
  { pattern: /lobby|entrance|public|tenant/i,                boost: 12, reason: 'Visible to tenants or public — reputational impact' },
]

function scoreWorkOrder(wo) {
  let score = PRIORITY_SCORE[wo.priority] || 0
  const text = `${wo.title} ${wo.description}`
  const reasons = []

  // Source-type bonuses
  if (wo.source_type === 'dvir')       { score += 35; reasons.push('Driver-reported defect — DOT compliance risk') }
  if (wo.source_type === 'fault_code') { score += 30; reasons.push('Diagnostic fault code — vehicle out-of-service risk') }
  if (wo.source_type === 'pm')         { score += 20; reasons.push('Overdue preventive maintenance — deferral compounds cost') }

  for (const rule of RISK_RULES) {
    if (rule.pattern.test(text)) { score += rule.boost; reasons.push(rule.reason) }
  }

  return { score, reasons: [...new Set(reasons)] }
}

function bestAssignee(wo, team) {
  const skilled = team.filter(m =>
    m.available &&
    (wo.required_skills.length === 0 || wo.required_skills.every(s => m.skills.includes(s)))
  )
  if (!skilled.length) return null
  return skilled.sort((a, b) => a.assigned_hours - b.assigned_hours)[0]
}

export function getSuggestions(workOrders, team) {
  const unassigned = workOrders.filter(wo => wo.status === 'unassigned' && !wo.is_candidate)

  return unassigned
    .map(wo => {
      const { score, reasons } = scoreWorkOrder(wo)
      const assignee = bestAssignee(wo, team)
      return { wo, score, reasons, assignee }
    })
    .sort((a, b) => b.score - a.score)
}

export function getRecommendedAssignee(wo, team) {
  return bestAssignee(wo, team)
}
