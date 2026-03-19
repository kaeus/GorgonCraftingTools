/**
 * Market-Specific NPC Logic
 * Contains all custom behaviors unique to the NPC on market.html
 * Includes scroll-triggered flying animation, market-specific dialogues, etc.
 */

import { gsap } from 'gsap'
import { NPCController } from './npc-controller.js'
import { getRandomDialogue } from './npc-dialogue.js'

export class MarketNPC {
  constructor(containerId = 'npc-max') {
    this.controller = new NPCController(containerId)
    this.containerElement = document.getElementById(containerId)
    this.spriteElement = this.containerElement ? this.containerElement.querySelector('.npc-sprite') : null
    this.flyingFrames = ['max_flying_1.png', 'max_flying_2.png', 'max_flying_3.png']
    this.baseFrame = 'max_0.png'
    this.imagePath = 'images/npcs/max/'
    
    this.scrollTimeout = null
    this.currentFrameIndex = 0
    this.isFlying = false
    this.bobbingTimeline = null
    this.flySound = null
    this.isPresent = false
    
    // Ensure sprite is visible by default
    if (this.spriteElement) {
      gsap.set(this.spriteElement, { opacity: 1 })
    }
    
    this.initScrollListener()
    this.initClickListener()
  }

  /**
   * Listen for click to dismiss Max with a goodbye.
   * Uses canvas hit-testing to only respond on non-transparent pixels.
   */
  initClickListener() {
    if (!this.containerElement || !this.spriteElement) return

    // Build an offscreen canvas for pixel hit-testing
    this._hitCanvas = document.createElement('canvas')
    this._hitCtx = this._hitCanvas.getContext('2d', { willReadFrequently: true })

    this.spriteElement.addEventListener('mousemove', (e) => {
      if (this._isOverOpaque(e)) {
        this.containerElement.classList.add('glow')
      } else {
        this.containerElement.classList.remove('glow')
      }
    })

    this.spriteElement.addEventListener('mouseleave', () => {
      this.containerElement.classList.remove('glow')
    })

    this.spriteElement.addEventListener('click', (e) => {
      if (this._isOverOpaque(e)) {
        this.dismiss()
      }
    })
  }

  /**
   * Check if the mouse is over a non-transparent pixel of the sprite
   */
  _isOverOpaque(e) {
    const img = this.spriteElement
    if (!img.naturalWidth) return false

    const rect = img.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) / rect.width * img.naturalWidth)
    const y = Math.round((e.clientY - rect.top) / rect.height * img.naturalHeight)

    this._hitCanvas.width = img.naturalWidth
    this._hitCanvas.height = img.naturalHeight
    this._hitCtx.drawImage(img, 0, 0)

    const pixel = this._hitCtx.getImageData(x, y, 1, 1).data
    return pixel[3] > 20 // alpha threshold
  }

  /**
   * Dismiss Max — say goodbye then exit
   */
  dismiss() {
    if (this._isDismissing || !this.isPresent) return
    this._isDismissing = true

    const dialogue = getRandomDialogue('marketGoodbye')
    this.controller.speak(dialogue, 3000)

    setTimeout(() => {
      this.controller.exitToRight(2.0)
      this._hasEntered = false
      this.isPresent = false
      setTimeout(() => {
        this._isDismissing = false
      }, 2000)
    }, 3000)
  }

  /**
   * Initialize scroll event listener for flying animation
   */
  initScrollListener() {
    let scrollTimeout
    
    window.addEventListener('scroll', () => {
      if (!this.isPresent) return

      // Start flying animation
      if (!this.isFlying) {
        this.isFlying = true
        this.startFlyingAnimation()
        this.startFlySound()
      }

      // Clear existing timeout
      clearTimeout(scrollTimeout)

      // Set timeout to revert to base image after scroll stops
      scrollTimeout = setTimeout(() => {
        this.revertToBase()
        this.isFlying = false
        this.stopFlySound()
      }, 500)
    }, { passive: true })
  }

  /**
   * Cycle through flying frames continuously
   */
  startFlyingAnimation() {
    // Ensure sprite is fully visible during flight
    gsap.to(this.spriteElement, {
      opacity: 1,
      duration: 0.1,
      overwrite: 'auto'
    })

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
    
    // Ensure sprite maintains opacity while reverting
    gsap.to(this.spriteElement, {
      opacity: 1,
      duration: 0.2,
      overwrite: 'auto'
    })
    
    this.stopBobbing()
  }

  startFlySound() {
    if (!this._hasEntered) return
    if (!this.flySound) {
      this.flySound = new Audio('sounds/max_fly.mp3')
      this.flySound.loop = true
    }
    this.flySound.volume = .25
    this.flySound.play().catch(() => {})
  }

  stopFlySound() {
    if (!this.flySound) return
    gsap.to(this.flySound, {
      volume: 0,
      duration: 0.5,
      onComplete: () => {
        this.flySound.pause()
        this.flySound.currentTime = 0
      }
    })
  }

  /**
   * Initialize entrance animation (called on page load)
   */
  enterScreen() {
    this.isPresent = true
    this.controller.enterFromRight(3.6, -30)
  }

  /**
   * Show random dialogue from market pool
   */
  speak(duration = 7000) {
    const dialogue = getRandomDialogue('market')
    this.controller.speak(dialogue, duration)
  }

  /**
   * Show random annoyed dialogue when bell is rung while Max is on screen
   */
  speakAnnoyed(duration = 5000) {
    const dialogue = getRandomDialogue('marketAnnoyed')
    this.controller.speak(dialogue, duration)
  }

  /**
   * Get the underlying controller for direct access if needed
   */
  getController() {
    return this.controller
  }
}
