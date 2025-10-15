const BEHAVIORAL_QUADRANTS = [
  [0, 0.25],
  [0.25, 0.5],
  [0.5, 0.75],
  [0.75, 1.0]
]

const JITTER = Math.random() * 0.1

console.log('New JITTER setting for round: ', JITTER)

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
    }
  }
}

const players = [
  {
    name: 'A',
    priors: getPriors(),
    self: true
  },
  {
    name: 'B',
    priors: getPriors()
  }
]

// Instigation is an action towards a receiver.
const instigate = (priors) => {
  players.forEach(p => {
    if (!p.self) {
      const affectConfidence = priors.beliefs.self.confidence > 0.5
      p.priors.beliefs.self.confidence *= 1 + (affectConfidence ? Math.random() * affectConfidence - JITTER : Math.random() * affectConfidence + JITTER)
  
      const affectInformation = priors.beliefs.self.information > 0.5
      p.priors.beliefs.self.information *= 1 + (affectInformation ? Math.random() * affectInformation - JITTER : Math.random() * affectInformation + JITTER)

      if (p.priors.beliefs.self.confidence > 1.0) p.priors.beliefs.self.confidence = 1.0
      if (p.priors.beliefs.self.confidence < 0) p.priors.beliefs.self.confidence = 0
      if (p.priors.beliefs.self.information > 1.0) p.priors.beliefs.self.information = 1.0
      if (p.priors.beliefs.self.information < 0) p.priors.beliefs.self.information = 0

      const affectInformationB = p.priors.beliefs.self.information > 0.5
      priors.beliefs.information *= 1 + (affectInformationB ? Math.random() * affectInformationB - JITTER : Math.random() * affectInformationB + JITTER)

      const affectConfidenceB = p.priors.beliefs.self.confidence > 0.5
      priors.beliefs.confidence *= 1 + (affectConfidenceB ? Math.random() * affectConfidenceB - JITTER : Math.random() * affectConfidenceB + JITTER)

      if (priors.beliefs.self.confidence > 1.0) priors.beliefs.self.confidence = 1.0
      if (priors.beliefs.self.confidence < 0) priors.beliefs.self.confidence = 0
      if (priors.beliefs.self.information > 1.0) priors.beliefs.self.confidence = 1.0
      if (priors.beliefs.self.information < 0) priors.beliefs.self.confidence = 0
    }
  })
}

// Observation is an action of collecting information to update priors
const observe = (priors) => {
  players.forEach(p => {
    if (!p.self) {
      const affectInformation = p.priors.beliefs.self.information
      priors.beliefs.self.information *= 1 + (affectInformation ? Math.random() * affectInformation - JITTER : Math.random() * affectInformation + JITTER)

      if (p.priors.beliefs.self.information > 1.0) p.priors.beliefs.self.information = 1.0
      if (p.priors.beliefs.self.information < 0) p.priors.beliefs.self.information = 0
    }
  })

  return priors
}

// Reception is an action of absorption from an instigator.
const receive = (priors) => {
  players.forEach(p => {
    if (!p.self) {
      const affectConfidence = p.priors.beliefs.self.confidence
      priors.beliefs.self.confidence *= 1 + (affectConfidence ? Math.random() * affectConfidence - JITTER : Math.random() * affectConfidence + JITTER)

      if (p.priors.beliefs.self.confidence > 1.0) p.priors.beliefs.self.confidence = 1.0
      if (p.priors.beliefs.self.confidence < 0) p.priors.beliefs.self.confidence = 0
    }
  })

  return priors
}

const getLikelihood = (priors) => {
  for (let i = 0; i < BEHAVIORAL_QUADRANTS.length; i++) {
    const b = BEHAVIORAL_QUADRANTS[i]
    if (priors.beliefs.self.confidence < b[1]) {
      priors.beliefs.self.information = priors.beliefs.self.information * Math.random() * b[1]
      break
    }
  }

  if ((priors.beliefs.self.information < 0.25 || 
       priors.beliefs.self.information > 0.75) && Math.random() >= 0.25) {
    console.log('\n\n==================================== reception\n\n', priors.beliefs)
    return receive(priors)
  } 

  if (priors.beliefs.self.information < 0.75 && Math.random() >= 0.75) {
    console.log('\n\n==================================== instigation\n\n', priors.beliefs)
    return instigate(priors)
  } 

  console.log('\n\n==================================== observation\n\n', priors.beliefs)
  return observe(priors)
}

console.log('Player count: ', players.length)

players.forEach(p => {
  p.priors = getLikelihood(p.priors)
})

setInterval(() => {
  players.forEach(p => {
    p.priors = getLikelihood(p.priors)
  })
}, 5000)
