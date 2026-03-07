/**
 * NPC Message System
 * Handles dialogue sequences for NPCs appearing on screen
 * 
 * Usage:
 * const npc = new NPCMessage('maxillae', {
 *   position: 'bottom-right',
 *   imagesPath: './images/black_wing_market_maxillae/',
 *   talkTime: 5000
 * })
 * npc.init()
 */

export class NPCMessage {
  constructor(npcName, options = {}) {
    this.npcName = npcName
    this.options = {
      position: options.position || 'bottom-right', // bottom-right, bottom-left, top-right, top-left, etc.
      imagesPath: options.imagesPath || `./images/${npcName}/`,
      imagePrefix: options.imagePrefix || 'max_', // prefix for max_0.png, max_1.png, etc.
      talkTime: options.talkTime || 5000,
      delayBeforeStart: options.delayBeforeStart || 1000,
      slideInTime: options.slideInTime || 3000,
      fadeInTime: options.fadeInTime || 2000,
      fadeOutTime: options.fadeOutTime || 2000,
      slideOutTime: options.slideOutTime || 3000,
      dialogueFrames: options.dialogueFrames || 12 // max_1.png through max_12.png
    }
    
    this.container = document.getElementById(`npc-${npcName}`)
    if (!this.container) {
      console.warn(`NPC container not found: #npc-${npcName}`)
      return
    }
    
    this.baseImg = this.container.querySelector('[data-npc-role="base"]')
    this.dialogueImg = this.container.querySelector('[data-npc-role="dialogue"]')
    
    if (!this.baseImg || !this.dialogueImg) {
      console.warn(`NPC images not found in container: #npc-${npcName}`)
      return
    }
  }
  
  init() {
    // Start the animation sequence after initial delay
    setTimeout(() => {
      this.startSequence()
    }, this.options.delayBeforeStart)
  }
  
  startSequence() {
    // Step 1: Slide in and wobble max_0 (3s)
    this.container.classList.add('active')
    
    // Step 2: After 2s delay, start fading in dialogue
    setTimeout(() => {
      this.showDialogue()
    }, this.options.slideInTime + 2000)
  }
  
  showDialogue() {
    // Pick random dialogue image (max_1 through max_x)
    const randomFrame = Math.floor(Math.random() * this.options.dialogueFrames) + 1
    const dialoguePath = `${this.options.imagesPath}${this.options.imagePrefix}${randomFrame}.png`
    this.dialogueImg.src = dialoguePath
    
    // Switch to talking state (fades in dialogue over 2s)
    this.container.classList.remove('active')
    this.container.classList.add('talking')
    
    // After 5 seconds of dialogue, fade it out
    setTimeout(() => {
      this.hideDialogue()
    }, this.options.talkTime)
  }
  
  hideDialogue() {
    // Switch to fading-out state (fades out dialogue over 2s)
    this.container.classList.remove('talking')
    this.container.classList.add('fading-out')
    
    // After dialogue fades out, slide out and wobble max_0
    setTimeout(() => {
      this.slideOut()
    }, this.options.fadeOutTime)
  }
  
  slideOut() {
    // Switch to leaving state (wobbles out max_0 for 3s)
    this.container.classList.remove('fading-out')
    this.container.classList.add('leaving')
    
    // After slide-out animation, hide everything and reset
    setTimeout(() => {
      this.baseImg.style.opacity = '0'
      this.baseImg.style.transform = 'translateX(100%) translateY(100%)'
      this.dialogueImg.src = ''
    }, this.options.slideOutTime)
  }
}

/**
 * Initialize a specific NPC message
 * @param {string} npcName - Name of the NPC (used for image paths and element IDs)
 * @param {object} options - Configuration options
 */
export function initNPCMessage(npcName, options = {}) {
  const npc = new NPCMessage(npcName, options)
  npc.init()
  return npc
}
