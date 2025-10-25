export const IMPULSE_P = 0.08
export const TAU_GAIN = [1.3, 1.8]
export const MU_KICK = [0.2, 0.35]
export const CENTER_REPEL = 0.004
export const CENTER_BAND = 0.06
export const CENTER_KICK_P = 0.08
export const CENTER_KICK_MIN = 0.08
export const CENTER_KICK_MAX = 0.15

export const BEHAVIORAL_QUADRANTS = [
  [0, 0.25],
  [0.25, 0.5],
  [0.5, 0.75],
  [0.75, 1.0]
]

const EDGE_WEIGHT = 0.75
const KICK_THRESH = 0.6
const SMOOTHSTEP_OBSERVE_MIN = 0.25
const SMOOTHSTEP_OBSERVE_MAX = 0.5
const SMOOTHSTEP_GATE_MAX = 0.65
const SMOOTHSTEP_GATE_MIN = 0.03

const rand = (a, b) => a + Math.random() * (b - a)

export function antiCenter(mu, strength = CENTER_REPEL) {
  const d = mu - 0.5
  const pull = 1 - Math.min(1, Math.abs(d) / 0.5)
  const dir = d === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(d)
  return clamp(mu + dir * strength * pull)
}

export function centerKick(mu) {
  if (Math.abs(mu - 0.5) >= CENTER_BAND) return mu
  if (Math.random() >= CENTER_KICK_P) return mu
  const dir = Math.random() < 0.5 ? -1 : 1
  return clamp(mu + dir * rand(CENTER_KICK_MIN, CENTER_KICK_MAX))
}

export function maybeImpulse(priors) {
  if (Math.random() >= IMPULSE_P) return priors

  if (Math.random() < EDGE_WEIGHT) {
    const kick = v => {
      const dir = Math.random() < 0.5 ? -1 : 1
      return clamp(v + dir * rand(...MU_KICK))
    }
    if (Math.random() < KICK_THRESH) {
      priors.beliefs.self.information = kick(priors.beliefs.self.information)
    } else {
      priors.beliefs.self.confidence = kick(priors.beliefs.self.confidence)
    }
  } else {
    const gC = rand(...TAU_GAIN)
    const gI = rand(...TAU_GAIN)
    priors.precision.self.confidence *= gC
    priors.precision.self.information *= gI
  }
  return priors
}

export function applyCenterDynamics(priors, { applyTo = ['information'], kick = true } = {}) {
  const apply = (mu) => {
    let m = antiCenter(mu)
    if (kick) m = centerKick(m)
    return m
  };
  if (applyTo.includes('information')) {
    priors.beliefs.self.information = apply(priors.beliefs.self.information)
  }
  if (applyTo.includes('confidence')) {
    priors.beliefs.self.confidence  = apply(priors.beliefs.self.confidence)
  }
  return priors
}

export const observeWeight = (infoMu) => {
  return smoothstep(SMOOTHSTEP_OBSERVE_MIN, SMOOTHSTEP_OBSERVE_MAX, Math.abs(infoMu - 0.5))
}

export const speakGateFromTau = (confTau) => {
  const norm = Math.min(1, confTau / 5)
  return smoothstep(SMOOTHSTEP_GATE_MIN, SMOOTHSTEP_GATE_MAX, norm)
}

export const wobble = tau => {
  const adjustedTau = Math.min(tau, 100)
  return 2 / (1 + Math.sqrt(Math.max(adjustedTau, 0.1)))
}

export const clamp = x => Math.max(0, Math.min(1, x))

export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

export const precisionToVariance = (tauOther) => Math.max(0.1, 1 / (tauOther + 1))
