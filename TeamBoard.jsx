import TeamMemberLane from './TeamMemberLane.jsx'

export default function TeamBoard({ team, workOrders, onUnassign, onStatusChange, onEditWorkOrder, onEditMember, onAddMember, onOpenTechnician, dragSkills }) {
  return (
    <div className="team-board">
      <div className="list-header">
        <h2>Team <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 400 }}>Click a member to view their schedule</span></h2>
        <button className="btn-primary" onClick={onAddMember}>+ Add Member</button>
      </div>
      <div className="lanes">
        {team.map(member => {
          const memberWOs = workOrders.filter(wo => wo.assigned_to === member.id)
          return (
            <TeamMemberLane
              key={member.id}
              member={member}
              workOrders={memberWOs}
              onUnassign={onUnassign}
              onStatusChange={onStatusChange}
              onEditWorkOrder={onEditWorkOrder}
              onEditMember={onEditMember}
              onOpenTechnician={onOpenTechnician}
              dragSkills={dragSkills}
            />
          )
        })}
        {team.length === 0 && (
          <div className="empty-state">No team members yet. Add one to get started.</div>
        )}
      </div>
    </div>
  )
}
