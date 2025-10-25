import { WORD_SETS } from './word-database.mjs'

const THRESHOLD = 0.6

export class WordSelector {
  constructor() {
    this.wordSets = WORD_SETS
  }

  parseBehaviorState(behaviorState) {
    const [behavior, intensity] = behaviorState.split('-')
    return {
      behavior: behavior?.toUpperCase(),
      intensity: intensity?.toUpperCase()
    }
  }

  getMaxLengthForBase(base) {
    const chunkSize = Math.ceil(Math.log(36) / Math.log(base))
    return Math.floor(24 / chunkSize)
  }

  getCognitiveProfile(uncertainty, urgency, noiseLevel = 0.1) {
    if (Math.random() < noiseLevel) {
      const profiles = ['CONFIDENT_CALM', 'UNCERTAIN_CALM', 'CONFIDENT_URGENT', 'UNCERTAIN_URGENT']
      return profiles[Math.floor(Math.random() * profiles.length)]
    }

    if (uncertainty > THRESHOLD) {
      return urgency > THRESHOLD ? 'UNCERTAIN_URGENT' : 'UNCERTAIN_CALM'
    } else {
      return urgency > THRESHOLD ? 'CONFIDENT_URGENT' : 'CONFIDENT_CALM'
    }
  }

  getWordsForContext(base, behaviorState = 'observing-mid', agentState = {}) {
    const maxLength = this.getMaxLengthForBase(base)
    const { behavior } = this.parseBehaviorState(behaviorState)

    if (maxLength < 2) {
      return []
    }

    const uncertainty = agentState.uncertainty || 0.5
    const urgency = agentState.urgency || 0.5

    const cognitiveProfile = this.getCognitiveProfile(uncertainty, urgency)

    const behaviorWords = this.wordSets[behavior]
    if (!behaviorWords) {
      return []
    }

    const profileWords = behaviorWords[cognitiveProfile]
    if (!profileWords) {
      return []
    }

    let candidateWords = []
    for (let length = 2; length <= maxLength; length++) {
      if (profileWords[length]) {
        candidateWords.push(...profileWords[length])
      }
    }

    let filteredWords = candidateWords
    if (uncertainty > 0.7) {
      const uncertaintyMaxLength = Math.min(4, maxLength)
      filteredWords = candidateWords.filter(word => word.length <= uncertaintyMaxLength)
    } else if (uncertainty > 0.4) {
      const uncertaintyMaxLength = Math.min(6, maxLength)
      filteredWords = candidateWords.filter(word => word.length <= uncertaintyMaxLength)
    }

    return filteredWords
  }

  getWord(base = 3, behaviorState = 'observing-mid', agentState = {}) {
    const availableWords = this.getWordsForContext(base, behaviorState, agentState)
    
    if (availableWords.length === 0) {
      const maxLength = this.getMaxLengthForBase(base)
      
      if (maxLength < 2) {
        return 'NO'
      }

      const { behavior } = this.parseBehaviorState(behaviorState)
      const behaviorWords = this.wordSets[behavior]
      
      if (behaviorWords) {
        for (const profile of ['CC', 'UC', 'CU', 'UU']) {
          const profileWords = behaviorWords[profile]
          if (profileWords) {
            let words = []
            for (let length = 2; length <= maxLength; length++) {
              if (profileWords[length]) {
                words.push(...profileWords[length])
              }
            }
            if (words.length > 0) {
              return words[Math.floor(Math.random() * words.length)]
            }
          }
        }
      }
      
      return 'NO'
    }
    
    return availableWords[Math.floor(Math.random() * availableWords.length)]
  }
}