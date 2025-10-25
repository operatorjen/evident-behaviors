import OnOff from 'on-off'
import { WordSelector } from './word-selector.mjs'
import { applyCenterDynamics, clamp,  maybeImpulse, observeWeight,
  precisionToVariance, speakGateFromTau, wobble, BEHAVIORAL_QUADRANTS } from './utils.mjs'

const wordSelector = new WordSelector()
const JITTER = Math.random() * 0.02
console.log('New JITTER setting for rounds:', JITTER)

const getStatus = (p) => {
  const OBSERVER_MIN_INTENT = 0.25
  const INSTIGATOR_MIN_INTENT = 0.5
  const cTau = p.priors.precision.self.confidence
  const iMu = p.priors.beliefs.self.information
  const iTau = p.priors.precision.self.information
  
  const speakIntent = speakGateFromTau(cTau) * (1 - observeWeight(iMu))
  const watchIntent = observeWeight(iMu) * Math.min(1, wobble(iTau))
  const uncertainty = 1 - (cTau / 20)
  const urgency = Math.abs(iMu - 0.5) * 2
  
  let role

  if (watchIntent > OBSERVER_MIN_INTENT && watchIntent > speakIntent) {
    if (clamp(watchIntent) <= 0.25) {
      role = 'observing-low'
    } else if (clamp(watchIntent) <= 0.5) {
      role = 'observing-mid'
    } else if (clamp(watchIntent) <= 0.75) {
      role = 'observing-high'
    } else {
      role = 'observing-peak'
    }
  } else if (speakIntent > INSTIGATOR_MIN_INTENT && speakIntent > watchIntent) {
    if (clamp(speakIntent) <= 0.25) {
      role = 'instigating-low'
    } else if (clamp(speakIntent) <= 0.5) {
      role = 'instigating-mid'
    } else if (clamp(speakIntent) <= 0.75) {
      role = 'instigating-high'
    } else {
      role = 'instigating-peak'
    }
  } else {
    if (clamp(watchIntent) <= 0.25) {
      role = 'receiving-low'
    } else if (clamp(watchIntent) <= 0.5) {
      role = 'receiving-mid'
    } else if (clamp(watchIntent) <= 0.75) {
      role = 'receiving-high'
    } else {
      role = 'receiving-peak'
    }
  }

  const tags = [role]

  return { 
    tags, 
    agentState: {
      uncertainty: clamp(uncertainty),
      urgency: clamp(urgency),
      confidence: p.priors.beliefs.self.confidence,
      information: p.priors.beliefs.self.information
    }
  }
}

const bayesUpdate = (mu, tau, z, r) => {
  const invR = 1 / r
  const tauPost = tau + invR
  const PRECISION_DECAY = 0.95
  const MAX_PRECISION = 50
  const dampedTau = Math.min(tauPost * PRECISION_DECAY, MAX_PRECISION)
  const muPost = (tau * mu + invR * z) / tauPost
  return { mu: clamp(muPost), tau: dampedTau }
}

const chooseAction = (infoMu, infoTau, confTau) => {
  const OBSERVE_BASE = 0.3
  const OBSERVE_EXTREME_BOOST = 0.4
  const INSTIGATE_BASE = 0.05  
  const INSTIGATE_CONFIDENCE_BOOST = 0.15
  const UNCERTAINTY_OBSERVE_BONUS = 0.1
  const UNCERTAINTY_INSTIGATE_PENALTY = 0.15
  const RECEIVE_MINIMUM = 0.15
  const wExt = observeWeight(infoMu)
  const speakG = speakGateFromTau(confTau)

  let pObs = OBSERVE_BASE + OBSERVE_EXTREME_BOOST * wExt
  let pInst = INSTIGATE_BASE + INSTIGATE_CONFIDENCE_BOOST * speakG * (1 - wExt)

  const wob = Math.min(1, wobble(infoTau))
  pObs = clamp(pObs + UNCERTAINTY_OBSERVE_BONUS * wob)
  pInst = clamp(pInst * (1 - UNCERTAINTY_INSTIGATE_PENALTY * wob))

  const recvFloor = RECEIVE_MINIMUM
  const pRecv = Math.max(recvFloor, 1 - (pObs + pInst))

  let sum = pObs + pInst + pRecv
  if (sum > 1) { pObs /= sum; pInst /= sum; pRecv /= sum }

  const r = Math.random()
  return r < pObs ? 'observing' : r < pObs + pInst ? 'instigating' : 'receiving'
}

// INSTIGATE: actor broadcasts; others update (confidence→confidence, information→information)
export const instigate = (players, priors, id) => {
  players.forEach(p => {
    if (p.id !== id) {
      // confidence channel (actor → other)
      {
        const z = priors.beliefs.self.confidence
        const r = precisionToVariance(priors.precision.self.confidence)
        const B = p.priors.beliefs.self.confidence
        const τ = p.priors.precision.self.confidence
        const up = bayesUpdate(B, τ, z, r + JITTER)
        p.priors.beliefs.self.confidence   = up.mu
        p.priors.precision.self.confidence = up.tau
      }
      // information channel (actor → other)
      {
        const z = priors.beliefs.self.information
        const r = precisionToVariance(priors.precision.self.information)
        const B = p.priors.beliefs.self.information
        const τ = p.priors.precision.self.information
        const up = bayesUpdate(B, τ, z, r + JITTER)
        p.priors.beliefs.self.information = up.mu
        p.priors.precision.self.information = up.tau
      }
    }
  })
  return priors
}

// OBSERVE: actor looks at other’s information to update own information
export const observe = (players, priors, id) => {
  const pool = players.filter(p => p.id !== id)
  const other = pool[Math.floor(Math.random() * pool.length)].priors
  const z = other.beliefs.self.information
  const r = precisionToVariance(other.precision.self.information)
  const B = priors.beliefs.self.information
  const τ = priors.precision.self.information
  const up = bayesUpdate(B, τ, z, r + JITTER)
  priors.beliefs.self.information = up.mu
  priors.precision.self.information = up.tau
  return priors
}

// RECEIVE: actor absorbs other’s confidence to update own confidence
export const receive = (players, priors, id) => {
  const pool = players.filter(p => p.id !== id)
  const other = pool[Math.floor(Math.random() * pool.length)].priors
  const z = other.beliefs.self.confidence
  const r = precisionToVariance(other.precision.self.confidence)
  const B = priors.beliefs.self.confidence
  const τ = priors.precision.self.confidence
  const up = bayesUpdate(B, τ, z, r + JITTER)
  priors.beliefs.self.confidence = up.mu
  priors.precision.self.confidence = up.tau
  return priors
}

export const getWord = (base = 3, behaviorState = 'observing-mid', agentState = {}) => {
  return wordSelector.getWord(base, behaviorState, agentState)
}

const generateSignal = async (behaviorState, agentState = {}) => {
  const protocol = new OnOff()
  const base = Math.floor(Math.random() * 35) + 2
  
  const chars = (getWord(base, behaviorState, agentState)).split('')
  
  let mappings = []
  
  for (const char of chars) {
    const c = protocol.base36ToBaseX(base, char)
    if (c) mappings.push(c)
  }

  let hour = 0
  for (const mapping of mappings) {
    const mi = mapping.split('')
    for (let m of mi) {
      const baseDigits = protocol.getBaseDigits(base)
      const digitValue = baseDigits.indexOf(m)
      
      if (digitValue === -1) {
        continue
      }
      
      if (hour > 23) break
      await protocol.decodeSignal(base, digitValue + 1, hour++)
    }
  }

  const message = await protocol.reconstructMessage(base, 0, hour - 1)
  return { message, base }
}

export const getLikelihood = (players, priors, id) => {
  {
    const PRECISION_RESET_THRESHOLD = 100
    const RESET_PRECISION_MIN = 2
    const RESET_PRECISION_RANGE = 3

    const SELF_PRECISION_DECAY = 0.8
    const OTHER_PRECISION_DECAY = 0.9
    const MAX_PRECISION_CAP = 20

    if (priors.precision.self.confidence > PRECISION_RESET_THRESHOLD || priors.precision.self.information > PRECISION_RESET_THRESHOLD) {
      priors.precision.self.confidence = RESET_PRECISION_MIN + RESET_PRECISION_RANGE * Math.random()
      priors.precision.self.information = RESET_PRECISION_MIN + RESET_PRECISION_RANGE * Math.random()
      console.log(`RESET: Player ${id} precision was too high`)
    }

    priors.precision.self.confidence *= SELF_PRECISION_DECAY
    priors.precision.self.information *= SELF_PRECISION_DECAY
    priors.precision.other.confidence *= OTHER_PRECISION_DECAY
    priors.precision.other.information *= OTHER_PRECISION_DECAY

    priors.precision.self.confidence = Math.min(MAX_PRECISION_CAP, priors.precision.self.confidence)
    priors.precision.self.information = Math.min(MAX_PRECISION_CAP, priors.precision.self.information)
    priors.precision.other.confidence = Math.min(MAX_PRECISION_CAP, priors.precision.other.confidence) 
    priors.precision.other.information = Math.min(MAX_PRECISION_CAP, priors.precision.other.information)
  }

  const CONFIDENCE_SCALING_FACTORS = [1.1, 1.0, 0.95, 0.9]

  priors = applyCenterDynamics(priors, { applyTo: ['information'], kick: true })
  priors = maybeImpulse(priors)

  for (let i = 0; i < BEHAVIORAL_QUADRANTS.length; i++) {
    const [lower, upper] = BEHAVIORAL_QUADRANTS[i]
    if (priors.beliefs.self.confidence >= lower && priors.beliefs.self.confidence < upper) {
      priors.beliefs.self.information = clamp(priors.beliefs.self.information * CONFIDENCE_SCALING_FACTORS[i])
      break
    }
  }

  const infoMu = priors.beliefs.self.information
  const infoTau = priors.precision.self.information
  const confTau = priors.precision.self.confidence

  const action = chooseAction(infoMu, infoTau, confTau)
  if (action === 'observing') return observe(players, priors, id)
  if (action === 'instigating') {
    return instigate(players, priors, id)
  }
  return receive(players, priors, id)
}

export const snapshotLine = async (p) => {
  const st = getStatus(p)
  const current = st.tags.join(',')

  const { message, base } = await generateSignal(current, st.agentState)
  
  let action = 'thinks '
  if (current.includes('instigating')) action = 'says '
  return `Player ${p.id} ${action} "${message}" in base${base} (uncertainty: ${st.agentState.uncertainty.toFixed(2)}, urgency: ${st.agentState.urgency.toFixed(2)})`
}