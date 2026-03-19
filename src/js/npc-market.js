/**
 * Market-Specific NPC Logic
 * Contains all custom behaviors unique to the NPC on market.html
 * Includes scroll-triggered flying animation, market-specific dialogues, etc.
 */

import { gsap } from 'gsap'
import { NPCController } from './npc-controller.js'
import { getRandomDialogue } from './npc-dialogue.js'

export class MarketNPC {
  constructor(containerId = 'npc-container') {
    this.controller = new NPCController(containerId)
    this.containerElement = document.getElementById(containerId)
    this.spriteElement = document.getElementById('npc-sprite')
    this.flyingFrames = ['max_flying_1.png', 'max_flying_2.png', 'max_flying_3.png']
    this.baseFrame = 'max_0.png'
    this.imagePath = './images/black_wing_market_maxillae/'
    
    this.scrollTimeout = null
    this.currentFrameIndex = 0
    this.isFlying = false
    this.bobbingTimeline = null
    
    this.initScrollListener()
  }

  /**
   * Initialize scroll event listener for flying animation
   */
  initScrollListener() {
    let scrollTimeout
    
    window.addEventListener('scroll', () => {
      // Start flying animation
      if (!this.isFlying) {
        this.isFlying = true
        this.startFlyingAnimation()
      }

      // Clear existing timeout
      clearTimeout(scrollTimeout)

      // Set timeout to revert to base image after scroll stops
      scrollTimeout = setTimeout(() => {
        this.revertToBase()
        this.isFlying = false
      }, 500)
    }, { passive: true })
  }

  /**
   * Cycle through flying frames continuously
   */
  startFlyingAnimation() {
    // Start bobbing animation
    this.startBobbing()

    const animationInterval = setInterval(() => {
      if (!this.isFlying) {
        clearInterval(animationInterval)
        return
      }

      // Move to next frame
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.flyingFrames.length
      const framePath = this.imagePath + this.flyingFrames[this.currentFrameIndex]
      this.spriteElement.src = framePath
    }, 150) // 150ms per frame creates smooth flapping effect
  }

  /**
   * Start bobbing animation while flying
   */
  startBobbing() {
    // Kill any existing bobbing timeline
    if (this.bobbingTimeline) {
      this.bobbingTimeline.kill()
    }

    this.bobbingTimeline = gsap.timeline({ repeat: -1 })
    this.bobbingTimeline.to(
      this.containerElement,
      {
        y: -15,
        x: 10,
        duration: 0.8,
        ease: 'sine.inOut'
      },
      0
    ).to(
      this.containerElement,
      {
        y: 15,
        x: -10,
        duration: 0.8,
        ease: 'sine.inOut'
      }
    ).to(
      this.containerElement,
      {
        y: 0,
        x: 0,
        duration: 0.8,
        ease: 'sine.inOut'
      }
    )
  }

  /**
   * Stop bobbing animation and reset position
   */
  stopBobbing() {
    if (this.bobbingTimeline) {
      this.bobbingTimeline.kill()
      this.bobbingTimeline = null
    }

    // Reset position to base
    gsap.to(this.containerElement, {
      x: 0,
      y: 0,
      duration: 0.3,
      ease: 'power2.out'
    })
  }

  /**
   * Revert to base image (max_0.png)
   */
  revertToBase() {
    const basePath = this.imagePath + this.baseFrame
    this.spriteElement.src = basePath
    this.currentFrameIndex = 0
    this.stopBobbing()
  }

  /**
   * Initialize entrance animation (called on page load)
   */
  enterScreen() {
    this.controller.enterFromRight(3.6)
  }

  /**
   * Show random dialogue from market pool
   */
  speak(duration = 7000) {
    const dialogue = getRandomDialogue('market')
    this.controller.speak(dialogue, duration)
  }

  /**
   * Get the underlying controller for direct access if needed
   */
  getController() {
    return this.controller
  }
}
