import '../css/global.css'
import * as AuthModule from './auth.js'
import * as FirebaseModule from './firebase.js'
import * as ListingsModule from './listings.js'
import * as OrdersModule from './orders.js'
import * as UtilsModule from './utils.js'
import * as OrderPageModule from './order-page.js'
import * as ListingsManagerModule from './listings-manager.js'
import * as SidebarModule from './sidebar.js'

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
 * Initialize page-specific functionality
 * Called when the DOM is ready
 */
function initializeApp() {
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
  
  // Load initial listings based on page
  if (document.querySelector('.listings-grid')) {
    // Check if we're on the market page or artisan alley page
    const pageTitle = document.querySelector('h1')?.textContent || ''
    if (pageTitle.includes('Black Wing Market')) {
      ListingsModule.loadMarketListings()
    } else {
      ListingsModule.loadListings()
    }
  }
  
  // Initialize order page if we're on order.html
  if (document.querySelector('#order-form')) {
    OrderPageModule.initOrderPage()
  }
  
  // Initialize listings manager if we're on yourListings.html
  if (document.querySelector('#crafting-area')) {
    FirebaseModule.onAuthStateChanged((user) => {
      AuthModule.renderUserAuth(user)
      if (user) {
        ListingsManagerModule.initListingsManager()
      } else {
        document.getElementById('status').textContent = 'You must be signed in to manage listings'
        document.getElementById('status').className = 'status-bar error'
      }
    })
    return // Skip the generic auth state change listener below
  }
  
  // Set up auth state listener
  FirebaseModule.onAuthStateChanged(async (user) => {
    AuthModule.renderUserAuth(user)
    if (user && document.querySelector('#my-orders-container')) {
      OrdersModule.subscribeMyOrders(user.uid, OrdersModule.renderMyOrders)
    }
  })
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
window.loadMarketListings = ListingsModule.loadMarketListings
window.searchListings = ListingsModule.searchListings

// Orders functions
window.cancelOrder = OrdersModule.cancelOrder
window.deleteOrder = OrdersModule.deleteOrder
window.createOrder = OrdersModule.createOrder

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
