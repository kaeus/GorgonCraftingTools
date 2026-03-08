import '../css/global.css'
import * as AuthModule from './auth.js'
import * as FirebaseModule from './firebase.js'
import * as ListingsModule from './listings.js'
import * as OrdersModule from './orders.js'
import * as UtilsModule from './utils.js'
import * as OrderPageModule from './order-page.js'
import * as ListingsManagerModule from './listings-manager.js'
import * as SidebarModule from './sidebar.js'
import { initNPCMessage } from './npc-message.js'
import * as ColiseumModule from './crooked-coliseum.js'

/**
 * Component Loader
 * Loads shared HTML components into designated slots on pages
 */
const ComponentLoader = {
  /**
   * Inject a component from external HTML file into a target element
   * @param {string} componentPath - Path to the HTML component file
   * @param {string} targetSelector - CSS selector for target element
   */
  async loadComponent(componentPath, targetSelector) {
    try {
      const target = document.querySelector(targetSelector)
      if (!target) {
        console.warn(`Target element not found: ${targetSelector}`)
        return
      }

      const response = await fetch(componentPath)
      if (!response.ok) {
        throw new Error(`Failed to load component: ${response.statusText}`)
      }

      const html = await response.text()
      target.innerHTML = html
    } catch (error) {
      console.error(`Error loading component ${componentPath}:`, error)
    }
  },

  /**
   * Load multiple components at once
   * @param {Object} components - Map of { targetSelector: componentPath }
   */
  async loadComponents(components) {
    const promises = Object.entries(components).map(([selector, path]) =>
      this.loadComponent(path, selector)
    )
    await Promise.all(promises)
  }
}

/**
 * Set up event listeners for all interactive elements
 * Uses data attributes instead of inline onclick handlers for CSP compliance
 */
function setupEventListeners() {
  // Auth modal handlers
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="open-auth"]')) {
      AuthModule.openAuthModal()
    }
    if (e.target.matches('[data-action="close-auth"]')) {
      AuthModule.closeAuthModal()
    }
    if (e.target.matches('[data-action="close-listing-type"]')) {
      const modal = document.getElementById('listing-type-modal')
      if (modal) modal.classList.remove('open')
    }
    if (e.target.matches('[data-action="close-item-listing"]')) {
      const modal = document.getElementById('item-listing-modal')
      if (modal) {
        modal.classList.remove('open')
        // Reset form for next use
        window.resetItemListingForm?.()
      }
    }
    if (e.target.matches('[data-action="close-service-listing"]')) {
      const modal = document.getElementById('service-listing-modal')
      if (modal) modal.classList.remove('open')
    }
    if (e.target.matches('[data-action="sign-in-google"]')) {
      AuthModule.signInGoogle()
    }
    if (e.target.matches('[data-action="sign-in-email"]')) {
      AuthModule.signInEmail()
    }
    if (e.target.matches('[data-action="sign-out"]')) {
      AuthModule.signOut()
    }
    if (e.target.matches('[data-action="submit-order"]')) {
      OrderPageModule.submitOrder()
    }
  })

  // Tab switching
  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[data-tab]')
    if (tabBtn) {
      AuthModule.switchTab(tabBtn.dataset.tab)
    }
  })

  // Email mode toggle
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="toggle-email-mode"]')) {
      AuthModule.toggleEmailMode()
    }
  })

  // Filter changes
  document.addEventListener('change', (e) => {
    if (e.target.id === 'server-filter') {
      ListingsModule.applyFilter()
    }
  })

  // Listing card click handlers
  document.addEventListener('click', (e) => {
    const listingCard = e.target.closest('[data-listing-id]')
    if (listingCard && e.target.matches('.action-btn, .listing-crafting-card')) {
      const listingId = listingCard.dataset.listingId
      window.location.href = `order.html?id=${listingId}`
    }
  })

  // Load all listings button (admin)
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="load-all-listings"]')) {
      window.loadAllListings()
    }
  })

  // Posting listing button
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="post-listing"]')) {
      window.location.href = 'yourListings.html'
    }
  })

  // Modal backdrop clicks to close
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop') && e.target.classList.contains('open')) {
      if (e.target.id === 'listing-type-modal' || e.target.id === 'item-listing-modal' || e.target.id === 'service-listing-modal') {
        e.target.classList.remove('open')
      }
    }
  })
}

/**
 * Maxillae Dialogue Sequence
 * After max_0 slides in, shows random dialogue images then exits
 */
/**
 * Initialize page-specific functionality
 * Called when the DOM is ready
 */
async function initializeApp() {
  console.log('CraftingCorner app initialized')
  
  // Render sidebar on all pages
  if (document.querySelector('#admin-panel')) {
    // Admin page
    SidebarModule.renderAdminSidebar()
  } else if (document.querySelector('#order-form')) {
    // Order page
    SidebarModule.renderOrderSidebar()
  } else {
    // All other pages (market/listings, etc.)
    SidebarModule.renderSidebar()
  }
  
  // Set up event listeners
  setupEventListeners()
  
  // Initialize Firebase if FIREBASE_CONFIG is available
  if (typeof FIREBASE_CONFIG !== 'undefined') {
    FirebaseModule.initializeFirebase(FIREBASE_CONFIG)
  }
  
  // Load initial listings if we're on the market page
  if (document.querySelector('.listings-grid')) {
    await ListingsModule.loadListings()
    
    // Initialize NPC message system for maxillae on market page
    initNPCMessage('maxillae', {
      position: 'bottom-right',
      imagesPath: './images/black_wing_market_maxillae/',
      imagePrefix: 'max_',
      talkTime: 5000
    })
  }
  
  // Initialize order page if we're on order.html
  if (document.querySelector('#order-form')) {
    OrderPageModule.initOrderPage()
  }
  
  // Initialize order-view page if we're on order-view.html
  if (document.querySelector('#order-details')) {
    const urlParams = new URLSearchParams(window.location.search)
    const orderId = urlParams.get('id')
    if (orderId) {
      await new Promise((resolve) => {
        const unsubscribe = FirebaseModule.onAuthStateChanged(async (user) => {
          AuthModule.renderUserAuth(user)
          const order = await OrdersModule.getOrderById(orderId)
          if (order) {
            await OrdersModule.renderOrderDetails(order, user)
          } else {
            const statusDiv = document.getElementById('status')
            if (statusDiv) {
              statusDiv.textContent = 'Order not found'
              statusDiv.className = 'status-bar error'
            }
          }
          unsubscribe()
          resolve()
        })
      })
    }
  }
  
  // Initialize listings manager if we're on yourListings.html
  if (document.querySelector('#crafting-area')) {
    // Wait for auth state to settle
    await new Promise((resolve) => {
      const unsubscribe = FirebaseModule.onAuthStateChanged(async (user) => {
        AuthModule.renderUserAuth(user)
        if (user) {
          await ListingsManagerModule.initListingsManager()
          OrdersModule.subscribeCrafterOrders(user.uid, OrdersModule.renderIncomingOrders)
        } else {
          document.getElementById('status').textContent = 'You must be signed in to manage listings'
          document.getElementById('status').className = 'status-bar error'
        }
        unsubscribe()
        resolve()
      })
    })
  } else if (document.querySelector('#coliseum-page')) {
    // Initialize the Crooked Coliseum page
    ColiseumModule.initColiseum()
    FirebaseModule.onAuthStateChanged((user) => {
      AuthModule.renderUserAuth(user)
      ColiseumModule.setCurrentUser(user)
    })
  } else {
    // Set up auth state listener for other pages
    FirebaseModule.onAuthStateChanged(async (user) => {
      AuthModule.renderUserAuth(user)
      if (user && document.querySelector('#my-orders-container')) {
        OrdersModule.subscribeMyOrders(user.uid, OrdersModule.renderMyOrders)
      }
    })
  }

  // Hide the global loading overlay after all content is loaded
  await hideGlobalLoadingOverlay()
}

/**
 * Hide the global loading overlay with fade-out effect
 */
async function hideGlobalLoadingOverlay() {
  const overlay = document.getElementById('global-loading-overlay')
  if (!overlay) return
  
  // Wait for fonts to load if available
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready
    } catch (e) {
      console.warn('Font loading check failed:', e)
    }
  }
  
  // Wait for next animation frame to ensure DOM is fully rendered
  await new Promise(resolve => requestAnimationFrame(resolve))
  
  // Give additional time for styles to apply
  await new Promise(resolve => setTimeout(resolve, 200))
  
  // Make body visible
  document.body.style.visibility = 'visible'
  
  // Add the hidden class to fade out the overlay
  overlay.classList.add('hidden')
  
  // Remove from DOM after animation completes
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.remove()
    }
  }, 500)
}

// Expose module functions to global scope for onclick handlers in HTML
window.openAuthModal = AuthModule.openAuthModal
window.closeAuthModal = AuthModule.closeAuthModal
window.signInGoogle = AuthModule.signInGoogle
window.signInEmail = AuthModule.signInEmail
window.signOut = AuthModule.signOut
window.switchTab = AuthModule.switchTab
window.toggleEmailMode = AuthModule.toggleEmailMode

// Listings functions
window.applyFilter = ListingsModule.applyFilter
window.loadListings = ListingsModule.loadListings
window.searchListings = ListingsModule.searchListings

// Orders functions
window.cancelOrder = OrdersModule.cancelOrder
window.deleteOrder = OrdersModule.deleteOrder
window.createOrder = OrdersModule.createOrder
window.cancelOrderAndReload = OrdersModule.cancelOrderAndReload
window.deleteOrderAndRedirect = OrdersModule.deleteOrderAndRedirect
window.markOrderInProgress = OrdersModule.markOrderInProgress
window.markOrderComplete = OrdersModule.markOrderComplete
window.subscribeCrafterOrders = OrdersModule.subscribeCrafterOrders
window.renderIncomingOrders = OrdersModule.renderIncomingOrders

// Listings manager functions
window.createNewListing = ListingsManagerModule.createNewListing
window.selectListingType = ListingsManagerModule.selectListingType
window.selectItem = ListingsManagerModule.selectItem
window.saveItemListing = ListingsManagerModule.saveItemListing
window.resetItemListingForm = ListingsManagerModule.resetItemListingForm
window.editListing = ListingsManagerModule.editListing
window.deleteListing = ListingsManagerModule.deleteListing
window.saveNewListing = ListingsManagerModule.saveNewListing
window.cancelListingForm = ListingsManagerModule.cancelListingForm
window.cancelItemListingForm = ListingsManagerModule.cancelItemListingForm
window.loadGoogleSheet = ListingsManagerModule.loadGoogleSheet

// Order page functions
window.submitOrder = OrderPageModule.submitOrder

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp)

// Export modules for use in other files
export default ComponentLoader
export * from './auth.js'
export * from './firebase.js'
export * from './listings.js'
export * from './orders.js'
export * from './utils.js'
