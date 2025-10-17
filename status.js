import { observeWeight, speakGateFromTau, wobble } from "./utils.js"

export const getStatus = (p) => {
  const OBSERVER_MIN_INTENT = 0.25
  const INSTIGATOR_MIN_INTENT = 0.5
  const cTau = p.priors.precision.self.confidence
  const iMu = p.priors.beliefs.self.information
  const iTau = p.priors.precision.self.information
  const speakIntent = speakGateFromTau(cTau) * (1 - observeWeight(iMu))
  const watchIntent = observeWeight(iMu) * Math.min(1, wobble(iTau))

  let role
  if (watchIntent > OBSERVER_MIN_INTENT && watchIntent > speakIntent) role = 'observing'
  else if (speakIntent > INSTIGATOR_MIN_INTENT && speakIntent > watchIntent) role = 'instigating'
  else role = 'receiving'

  const tags = [role]

  const line = (() => {
    if (role === 'instigating') {
      return 'leans to speak; likely to push others toward current stance'
    }
    if (role === 'observing') {
      return 'leans to watch; likely to adapt based on others'
    }
    return 'between speaking and listening'
  })()

  return { tags, line }
}
