import { updateRound, generatePriors } from './index.mjs'

const start = () => {
  let players = []
  for (let i = 0; i < 5; i++) { 
    players.push({ id: i, priors: generatePriors()
  })}

  console.log(`Player count: ${players.length}, rounds: infinite`)

  players = updateRound(players)
  setInterval(() => {
    players = updateRound(players)
  }, 500)
}

start()