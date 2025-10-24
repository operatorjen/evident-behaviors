import OnOff from 'on-off'

const WORDS = {
  2: ['NO', 'OK', 'UP', 'ON', 'GO', 'OR', 'IS', 'TO', 'BE'],
  3: ['YES', 'NOT', 'MAP', 'AIM', 'END', 'TOP', 'LOW', 'BAD', 'HOT', 'COLD', 'AND'],
  4: ['GOOD', 'HIGH', 'LOW', 'FAST', 'SLOW', 'EASY', 'HARD', 'LEFT', 'RIGHT', 'STOP', 'WAIT', 'NEXT', 'MORE', 'LESS', 'SAME', 'DIFF', 'INTO', 'ALSO', 'QUIZ'],
  5: ['HELLO', 'WORLD', 'START', 'READY', 'BEGIN', 'CLOSE', 'SMART', 'QUICK', 'BLUE', 'GOLD', 'GREEN', 'SMALL', 'LARGE', 'LIGHT', 'HEAVY', 'IRONY', 'INTEL', 'CLUES', 'COUNT', 'FLORA'],
  6: ['SIMPLE', 'NORMAL', 'STRONG', 'WEAK', 'BETTER', 'WORSE', 'CHANGE', 'UPDATE', 'SILVER', 'STATUS', 'NUMBER', 'RANDOM', 'SYSTEM', 'ERSATZ', 'FOREST'],
  7: ['PERFECT', 'MAXIMUM', 'MINIMUM', 'CORRECT', 'ERROR', 'SUCCESS', 'FAILURE', 'PROBLEM', 'SOLUTION', 'HABITAT'],
  8: ['COMPLETE', 'FINISHED', 'CONTINUE', 'APPROVED', 'REJECTED', 'POSITIVE', 'NEGATIVE', 'IMMINENT', 'ABSOLUTE', 'HABITANT'],
  9: ['IMMEDIATE', 'EMERGENCY', 'IMPORTANT', 'NECESSARY', 'AVAILABLE', 'UNTANGLED', 'REFLEXIVE', 'QUADRATIC'],
  10: ['IMPOSSIBLE', 'UNEXPECTED', 'DANGEROUS', 'CRITICALLY', 'OBLIVIOUS', 'VISCERALLY', 'SIMULATION', 'ANTICIPATE']
}

const getWord = (base = 3) => {
  const words = getWordsForBase(base)
  
  if (words.length === 0) {e
    const chunkSize = Math.ceil(Math.log(36) / Math.log(base))
    const max = Math.floor(24 / chunkSize)

    for (let length = max; length > 0; length--) {
      if (WORDS[length]) {
        const words = WORDS[length]
        return words[Math.floor(Math.random() * words.length)]
      }
    }
    
    return 'NO'
  }
  
  return words[Math.floor(Math.random() * words.length)]
}

export const getWordsForBase = (base) => {
  const chunkSize = Math.ceil(Math.log(36) / Math.log(base))
  const max = Math.floor(24 / chunkSize)

  let words = []
  for (const [length, wordArr] of Object.entries(WORDS)) {
    if (parseInt(length) <= max) {
      words.push(...wordArr)
    }
  }
  
  return words
}
  
export const generateSignal = async () => {
  const protocol = new OnOff()
  const base = Math.floor(Math.random() * 35) + 2
  const chars = (getWord(base)).split('')
  
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