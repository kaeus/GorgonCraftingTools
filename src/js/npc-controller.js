/**
 * NPC Controller System
 * Manages NPC animations, movement, and dialogue using GSAP
 * 
 * Usage:
 * const npc = new NPCController('npc-container')
 * npc.moveTo(300, 400)
 * npc.speak('Welcome to the market')
 */

import { gsap } from 'gsap'

export class NPCController {
  constructor(containerId = 'npc-container') {
    this.container = document.getElementById(containerId)
    if (!this.container) {
      console.error(`NPC container not found: #${containerId}`)
      return
    }

    this.sprite = this.container.querySelector('#npc-sprite')
    this.bubble = this.container.querySelector('#npc-bubble')
    this.text = this.container.querySelector('#npc-text')

    if (!this.sprite || !this.bubble || !this.text) {
      console.error('NPC DOM elements not properly structured')
      return
    }

    this.isInitialized = true
    this.timeline = null
  }

  /**
   * Move NPC to specific coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} duration - Animation duration in seconds (default 1.5)
   */
  moveTo(x, y, duration = 1.5) {
    if (!this.isInitialized) return

    gsap.to(this.container, {
      x: x,
      y: y,
      duration: duration,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  /**
   * Move NPC along a path with multiple waypoints
   * @param {Array} points - Array of {x, y, duration} objects
   */
  walkPath(points) {
    if (!this.isInitialized || !points.length) return

    const tl = gsap.timeline()

    points.forEach((point) => {
      tl.to(
        this.container,
        {
          x: point.x,
          y: point.y,
          duration: point.duration || 1.5,
          ease: 'power2.inOut'
        },
        0 // Each animation starts at the same time as the previous ends
      )
    })

    return tl
  }

  /**
   * Show dialogue text in speech bubble
   * @param {string} text - The dialogue text to display
   * @param {number} duration - How long to display (default 3000ms)
   */
  speak(text, duration = 3000) {
    if (!this.isInitialized) return

    // Set the text
    this.text.innerText = text

    // Fade in bubble
    gsap.to(this.bubble, {
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out'
    })

    // Auto-hide after duration
    gsap.delayedCall(duration / 1000, () => {
      this.hideSpeech()
    })
  }

  /**
   * Hide the speech bubble
   * @param {number} duration - Fade out animation duration (default 0.4)
   */
  hideSpeech(duration = 0.4) {
    if (!this.isInitialized) return

    gsap.to(this.bubble, {
      opacity: 0,
      duration: duration,
      ease: 'power2.in'
    })
  }

  /**
   * Animate NPC entering from the right
   * @param {number} duration - Animation duration (default 3.6)
   */
  enterFromRight(duration = 3.6) {
    if (!this.isInitialized) return

    const tl = gsap.timeline()

    // Slide animation
    tl.to(
      this.container,
      {
        right: 0,
        duration: duration,
        ease: 'power2.out',
        overwrite: 'auto'
      },
      0
    )

    // Wobble animation - runs for entire slide duration
    // Calculate how many wobble cycles fit in the slide duration (0.6s per cycle)
    const wobbleCycles = Math.floor(duration / 0.6)
    tl.to(
      this.container,
      {
        rotateZ: 3,
        duration: 0.6,
        repeat: wobbleCycles - 1,
        yoyo: true,
        ease: 'sine.inOut',
        transformOrigin: 'bottom center'
      },
      0
    )
  }

  /**
   * Animate NPC entering from the left
   * @param {number} duration - Animation duration (default 1.8)
   */
  enterFromLeft(duration = 1.8) {
    if (!this.isInitialized) return

    gsap.from(this.container, {
      x: -this.container.offsetWidth - 200,
      duration: duration,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  /**
   * Animate NPC exiting to the right
   * @param {number} duration - Animation duration (default 1.8)
   */
  exitToRight(duration = 1.8) {
    if (!this.isInitialized) return

    gsap.to(this.container, {
      x: window.innerWidth + 200,
      duration: duration,
      ease: 'power2.in',
      overwrite: 'auto'
    })
  }

  /**
   * Animate NPC exiting to the left
   * @param {number} duration - Animation duration (default 1.8)
   */
  exitToLeft(duration = 1.8) {
    if (!this.isInitialized) return

    gsap.to(this.container, {
      x: -this.container.offsetWidth - 200,
      duration: duration,
      ease: 'power2.in',
      overwrite: 'auto'
    })
  }

  /**
   * Start subtle idle animation
   * Creates a gentle up-and-down bobbing effect
   */
  idleAnimation() {
    if (!this.isInitialized) return

    gsap.to(this.sprite, {
      y: -6,
      repeat: -1,
      yoyo: true,
      duration: 0.6,
      ease: 'sine.inOut'
    })
  }

  /**
   * Stop all idle animations
   */
  stopIdleAnimation() {
    if (!this.isInitialized) return

    gsap.killTweensOf(this.sprite)
  }

  /**
   * Wiggle animation (playful side-to-side motion)
   * @param {number} duration - Animation duration (default 0.4)
   * @param {number} repeats - Number of wiggle cycles (default 3)
   */
  wiggle(duration = 0.4, repeats = 3) {
    if (!this.isInitialized) return

    gsap.to(this.sprite, {
      rotation: 3,
      duration: duration / 2,
      repeat: repeats * 2,
      yoyo: true,
      ease: 'sine.inOut',
      transformOrigin: '50% 100%'
    })
  }

  /**
   * Shake animation (for emphasis or emotion)
   * @param {number} intensity - Shake intensity (default 5)
   * @param {number} duration - Animation duration (default 0.3)
   */
  shake(intensity = 5, duration = 0.3) {
    if (!this.isInitialized) return

    gsap.to(this.container, {
      x: `+=${intensity}`,
      duration: duration / 8,
      repeat: 7,
      yoyo: true,
      ease: 'power1.inOut'
    })
  }

  /**
   * Bounce animation (for celebration or surprise)
   * @param {number} height - Bounce height in pixels (default 30)
   * @param {number} duration - Animation duration (default 0.6)
   */
  bounce(height = 30, duration = 0.6) {
    if (!this.isInitialized) return

    gsap.to(this.container, {
      y: `-=${height}`,
      duration: duration / 2,
      repeat: 1,
      yoyo: true,
      ease: 'power2.out'
    })
  }

  /**
   * Fade out entire NPC
   * @param {number} duration - Animation duration (default 0.5)
   */
  fadeOut(duration = 0.5) {
    if (!this.isInitialized) return

    gsap.to(this.container, {
      opacity: 0,
      duration: duration,
      ease: 'power2.in'
    })
  }

  /**
   * Fade in entire NPC
   * @param {number} duration - Animation duration (default 0.5)
   */
  fadeIn(duration = 0.5) {
    if (!this.isInitialized) return

    gsap.to(this.container, {
      opacity: 1,
      duration: duration,
      ease: 'power2.out'
    })
  }

  /**
   * Kill all GSAP animations on this NPC
   */
  killAll() {
    gsap.killTweensOf([this.container, this.sprite, this.bubble, this.text])
  }

  /**
   * Reset NPC to default state
   */
  reset() {
    if (!this.isInitialized) return

    this.killAll()
    gsap.set(this.container, {
      x: 0,
      y: 0,
      opacity: 1
    })
    gsap.set(this.bubble, {
      opacity: 0
    })
    this.text.innerText = ''
  }
}
