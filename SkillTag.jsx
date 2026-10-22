export default function SkillTag({ skill, highlight }) {
  return (
    <span className={`skill-tag ${highlight ? 'skill-tag--match' : ''}`}>
      {skill}
    </span>
  )
}
