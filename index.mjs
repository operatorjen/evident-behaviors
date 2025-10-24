import { getStatus } from './status.mjs'
import { applyCenterDynamics, clamp,  maybeImpulse, observeWeight,
  precisionToVariance, speakGateFromTau, wobble } from './utils.mjs'
import { generateSignal } from './wordbag.mjs'

const BEHAVIORAL_QUADRANTS = [
  [0, 0.25],
  [0.25, 0.5],
  [0.5, 0.75],
  [0.75, 1.0]
]

const JITTER = Math.random() * 0.02
console.log('New JITTER setting for rounds:', JITTER)

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

export const generatePriors = () => {
  return {
    beliefs: {
      self: {
        confidence: Math.random(),
        information: Math.random()
      },
      other: {
        confidence: Math.random(),
        information: Math.random()
      }
    },
    precision: {
      self: {
        confidence: 1 + 2 * Math.random(),
        information: 1 + 2 * Math.random()
      },
      other: {
        confidence: 1 + 2 * Math.random(),
        information: 1 + 2 * Math.random()
      }
    }
  }
}

// INSTIGATE: actor broadcasts; others update (confidence→confidence, information→information)
const instigate = (players, priors, id) => {
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
const observe = (players, priors, id) => {
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
const receive = (players, priors, id) => {
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

const getLikelihood = (players, priors, id) => {
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

let round = 1

const snapshotLine = async (p) => {
  const st = getStatus(p)
  const current = st.tags.join(',')

  if (current === 'instigating') {
    const message = await generateSignal()
    return `Player says ${message}!`
  } else {
    return `P${p.id}:\tConf: μ ${+p.priors.beliefs.self.confidence.toFixed(2)}, τ ${p.priors.precision.self.confidence.toFixed(2)}\n` +
    `\tInfo: μ ${p.priors.beliefs.self.information.toFixed(2)}, τ ${p.priors.precision.self.information.toFixed(2)}, Status: ${current}\n`
  }
}

export const updateRound = async (players) => {
  console.log(`\nRound ${round}\n`)
  for (const p of players) {
    p.priors = getLikelihood(players, p.priors, p.id)
    console.log(await snapshotLine(p))
  }
  round++
  return players
}
