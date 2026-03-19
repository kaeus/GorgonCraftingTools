/**
 * Bell NPC Logic
 * A global NPC that appears on every page from the top-right.
 * Static image: bell_middle.png — always persists, never speaks.
 */

import { gsap } from 'gsap'
import { NPCController } from './npc-controller.js'

export class BellNPC {
  constructor(containerId = 'npc-bell') {
    this.controller = new NPCController(containerId)
    this.containerElement = document.getElementById(containerId)
    this.spriteElement = this.containerElement ? this.containerElement.querySelector('.npc-sprite') : null
    this.isRinging = false

    this.imagePath = 'images/npcs/bell/'
    this.frames = {
      middle: this.imagePath + 'bell_middle.png',
      left: this.imagePath + 'bell_left.png',
      right: this.imagePath + 'bell_right.png'
    }

    if (this.spriteElement) {
      gsap.set(this.spriteElement, { opacity: 1 })
    }

    this.initHoverListener()
  }

  /**
   * Listen for mouse hover glow and click to ring
   */
  initHoverListener() {
    if (!this.containerElement) return
    this.containerElement.style.pointerEvents = 'auto'
    this.containerElement.style.cursor = 'pointer'
    this.containerElement.addEventListener('click', () => this.ring())
  }

  /**
   * Ring the bell — wobble animation cycling through frames
   * Dispatches a 'bell_ring' custom event on the container
   */
  ring() {
    if (this.isRinging || !this.spriteElement) return
    this.isRinging = true

    // Disable hover glow for 3 seconds
    this.containerElement.classList.add('no-glow')
    setTimeout(() => this.containerElement.classList.remove('no-glow'), 3000)

    // Play cowbell sound
    const sound = new Audio('sounds/cowbell.mp3')
    sound.volume = 0.02
    sound.play()

    this.containerElement.dispatchEvent(new CustomEvent('bell_ring', { bubbles: true }))

    const sequence = ['left', 'right', 'left', 'right', 'left', 'right', 'middle']
    const tl = gsap.timeline({
      onComplete: () => {
        this.isRinging = false
        // Fade out sound over 0.5s
        gsap.to(sound, {
          volume: 0,
          duration: 0.5,
          onComplete: () => {
            sound.pause()
            sound.currentTime = 0
          }
        })
      }
    })

    sequence.forEach((frame, i) => {
      const angle = frame === 'left' ? -8 : frame === 'right' ? 8 : 0
      // Diminish swing as we progress
      const decay = 1 - (i / sequence.length) * 0.6
      tl.to(this.containerElement, {
        rotateZ: angle * decay,
        duration: 0.26,
        ease: 'sine.inOut',
        transformOrigin: 'top center',
        onStart: () => {
          this.spriteElement.src = this.frames[frame]
        }
      })
    })

    // Settle back to neutral
    tl.to(this.containerElement, {
      rotateZ: 0,
      duration: 0.3,
      ease: 'power2.out'
    })
  }

  /**
   * Initialize entrance animation (slide down from top)
   */
  enterScreen() {
    this.controller.enterFromTop(3.0, -30)
  }

  /**
   * Get the underlying controller for direct access
   */
  getController() {
    return this.controller
  }
}
