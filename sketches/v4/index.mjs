import { snapshotLine, getLikelihood } from './status.mjs'

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

let round = 1

export const updateRound = async (players) => {
  console.log(`\nCycle ${round}\n`)
  for (const p of players) {
    p.priors = getLikelihood(players, p.priors, p.id)
    console.log(await snapshotLine(p))
  }
  round++
  return players
}
