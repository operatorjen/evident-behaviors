import { updateRound, generatePriors } from './index.mjs'

const start = async () => {
  let players = []
  for (let i = 0; i < 10; i++) { 
    players.push({ id: i, priors: generatePriors()
  })}

  console.log(`Player count: ${players.length}`)

  setInterval(async () => {
    players = await updateRound(players)
  }, 800)
}

start()