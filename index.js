const BEHAVIORAL_QUADRANTS = [
  [0, 0.25],
  [0.25, 0.5],
  [0.5, 0.75],
  [0.75, 1.0]
]

const JITTER = Math.random() * 0.01
console.log('New JITTER setting for rounds:', JITTER)

const clamp01 = x => Math.max(0, Math.min(1, x))
const precisionToVariance = (tauOther) => Math.max(0.10, 1 / (tauOther + 1))

const bayesUpdate = (mu, tau, z, r) => {
  const invR = 1 / r
  const tauPost = tau + invR
  const muPost = (tau * mu + invR * z) / tauPost
  return { mu: clamp01(muPost), tau: tauPost }
}

const FORGET = 0.02
const DRIFT = 0.02
const timeUpdate = (mu, tau) => {
  const tau2 = Math.max(0, tau * (1 - FORGET))
  const mu2 = clamp01(mu + DRIFT * (0.5 - mu))
  return { mu: mu2, tau: tau2 }
}

const getPriors = () => {
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

const players = [
  { id: 1, priors: getPriors() },
  { id: 2, priors: getPriors() },
  { id: 3, priors: getPriors() }
]

// INSTIGATE: actor broadcasts; OTHER updates (confidence→confidence, information→information)
const instigate = (priors, id) => {
  players.forEach(p => {
    if (p.id !== id) {
      // confidence channel (actor → other)
      {
        const z  = priors.beliefs.self.confidence
        const r  = precisionToVariance(priors.precision.self.confidence)
        const B  = p.priors.beliefs.self.confidence
        const τ  = p.priors.precision.self.confidence
        const up = bayesUpdate(B, τ, z, r + JITTER)
        p.priors.beliefs.self.confidence   = up.mu
        p.priors.precision.self.confidence = up.tau
      }
      // information channel (actor → other)
      {
        const z  = priors.beliefs.self.information
        const r  = precisionToVariance(priors.precision.self.information)
        const B  = p.priors.beliefs.self.information
        const τ  = p.priors.precision.self.information
        const up = bayesUpdate(B, τ, z, r + JITTER)
        p.priors.beliefs.self.information   = up.mu
        p.priors.precision.self.information = up.tau
      }
    }
  })
  return priors
}

// OBSERVE: actor looks at other’s *information* to update own information
const observe = (priors, id) => {
  const other = players.find(p => p.id !== id).priors

  const z  = other.beliefs.self.information
  const r  = precisionToVariance(other.precision.self.information)
  const B  = priors.beliefs.self.information
  const τ  = priors.precision.self.information

  const up = bayesUpdate(B, τ, z, r + JITTER)
  priors.beliefs.self.information   = up.mu
  priors.precision.self.information = up.tau

  return priors
}

// RECEIVE: actor absorbs other’s *confidence* to update own confidence
const receive = (priors, id) => {
  const other = players.find(p => p.id !== id).priors
  const z = other.beliefs.self.confidence
  const r = precisionToVariance(other.precision.self.confidence)
  const B = priors.beliefs.self.confidence
  const τ = priors.precision.self.confidence

  const up = bayesUpdate(B, τ, z, r + JITTER)
  priors.beliefs.self.confidence = up.mu
  priors.precision.self.confidence = up.tau

  return priors
}

const getLikelihood = (priors, id) => {
  {
    const cTU = timeUpdate(priors.beliefs.self.confidence,  priors.precision.self.confidence)
    const iTU = timeUpdate(priors.beliefs.self.information, priors.precision.self.information)
    priors.beliefs.self.confidence = cTU.mu
    priors.precision.self.confidence = cTU.tau
    priors.beliefs.self.information = iTU.mu
    priors.precision.self.information = iTU.tau
  }

  for (let i = 0; i < BEHAVIORAL_QUADRANTS.length; i++) {
    const b = BEHAVIORAL_QUADRANTS[i]
    if (priors.beliefs.self.confidence < b[1]) {
      const scale = (0.9 + 0.1 * Math.random()) * b[1]
      priors.beliefs.self.information = clamp01(priors.beliefs.self.information * scale)
      break
    }
  }

  if ((priors.beliefs.self.information < 0.25 ||
       priors.beliefs.self.information > 0.75) && Math.random() >= 0.25) {
    return receive(priors, id)
  }

  if (priors.beliefs.self.information < 0.75 && Math.random() >= 0.75) {
    return instigate(priors, id)
  }

  return observe(priors, id)
}

let round = 1
console.log(`Player count: ${players.length}, rounds: infinite`)

const updateRound = () => {
  console.log(`\nRound ${round}\n`)
  players.forEach(p => {
    p.priors = getLikelihood(p.priors, p.id)
    const output = `P${p.id}:\tConfidence: mu ${+p.priors.beliefs.self.confidence.toFixed(3)} / tau ${+p.priors.precision.self.confidence.toFixed(2)}\n\tInformation: mu ${+p.priors.beliefs.self.information.toFixed(3)} / tau ${+p.priors.precision.self.information.toFixed(2)}`
    console.log(output)
  })
  round++
}

 updateRound()
 setInterval(updateRound, 2000)
