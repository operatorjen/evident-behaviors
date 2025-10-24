import OnOff from 'on-off'
import { MAPPING } from './mapping.mjs'

const WORDS = [
  'HELLO', 'YES', 'NO', 'GOOD', 'OKAY', 'SURE', 'NOPE', 'MAYBE', 'WHAT', 'OK', 
  'LEFT', 'RIGHT', 'UP', 'DOWN', 'ROTATE', 'TURN', 'SOFT', 'HARD', 'SIMPLE', 'DARK',
  'LIGHT', 'NOT', 'GREAT', 'MEH', 'ANNOY', 'ARGUE', 'LAUGH', 'JOKE', 'MAP', 'ALIGN', 
  'ASSESS', 'KEEP', 'GIVE', 'TAKE', 'WANT', 'SHARE', 'FAIR', 'EVEN', 'UNEVEN', 'UNFAIR',
  'AIM', 'MISS', 'CARRY', 'NEXT', 'BEFORE', 'AFTER', 'FLASH', 'SIGN', 'SIGNAL'
]

const getWord = () => {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]
  const chars = word.split('')
  return chars
}

export const generateSignal = async () => {
  const protocol = new OnOff()
  const chars = getWord()
  let mappings = []
  
  for (const char of chars) {
    const c = char
    if (MAPPING[c]) {
      const ms = MAPPING[c].split('')
      mappings.push(ms)
    }
  }

  let hour = 0
  for (const mapping of mappings) {
    for (const mi of mapping) {
      await protocol.decodeSignal(+mi + 1, hour++)
    }
  }

  const message = await protocol.reconstructMessage(0, hour - 1)
  return message
}