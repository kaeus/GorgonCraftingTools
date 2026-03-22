/**
 * Fetcher Listing Page Module
 * Handles the form for hiring fetchers
 */

import * as Firebase from './firebase.js'
import * as Auth from './auth.js'
import { escapeHtml, setStatus } from './utils.js'
import { getRandomNail, getNailPositionStyle } from './scroll-edge.js'

/**
 * Initialize the fetcher page
 */
export function initFetcherPage() {
  console.log('[Fetcher] Initializing fetcher page...')
  
  // Wait a tick for Firebase to be initialized
  setTimeout(() => {
    setupPageInitialization()
  }, 50)
}

function setupPageInitialization() {
  // Set up auth state listener
  Firebase.onAuthStateChanged(user => {
    console.log('[Fetcher] Auth state changed, user:', user ? user.email : 'none')
    Auth.renderUserAuth(user)
    
    // Auto-populate form fields from account settings
    if (user) {
      populateFromAccountSettings()
    }
    
    // Hide loading overlay when done
    setTimeout(() => {
      const overlay = document.getElementById('global-loading-overlay')
      if (overlay) overlay.style.display = 'none'
      
      const statusBar = document.getElementById('status')
      if (statusBar) statusBar.style.display = 'none'
      
      document.body.style.visibility = 'visible'
      
      // Create nail image only when page is ready to display
      createNail()
    }, 200)
  })

  // Set up form listeners
  setupFormListeners()
}

/**
 * Set up event listeners for the form
 */
function setupFormListeners() {
  const form = document.getElementById('fetcher-listing-form')
  const charNameInput = document.getElementById('fetcher-character-name')
  const serverInput = document.getElementById('fetcher-server')
  const commissionInput = document.getElementById('fetcher-commission')
  const submitBtn = document.getElementById('fetcher-submit-btn')

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      await saveFetcherListing()
    })
  }

  // Update button state on input changes
  const inputs = [charNameInput, serverInput, commissionInput]
  inputs.forEach(input => {
    if (input) {
      input.addEventListener('input', validateForm)
      input.addEventListener('change', validateForm)
    }
  })

  // Initial validation
  validateForm()
}

/**
 * Validate form and enable/disable submit button
 */
function validateForm() {
  const charName = document.getElementById('fetcher-character-name').value.trim()
  const server = document.getElementById('fetcher-server').value.trim()
  const commission = document.getElementById('fetcher-commission').value.trim()
  
  const submitBtn = document.getElementById('fetcher-submit-btn')
  const isValid = charName && server && commission
  
  if (submitBtn) {
    submitBtn.disabled = !isValid
    submitBtn.style.opacity = isValid ? '1' : '0.5'
    submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed'
  }
}

/**
 * Load and populate form fields from account settings
 */
async function populateFromAccountSettings() {
  try {
    const user = Firebase.getAuth()?.currentUser
    if (!user) return

    const db = Firebase.getFirestore()
    if (!db) return

    const userDoc = await db.collection('users').doc(user.uid).get()
    if (!userDoc.exists) return

    const data = userDoc.data()
    
    // Populate Character Name if not already filled
    const charNameInput = document.getElementById('fetcher-character-name')
    if (charNameInput && !charNameInput.value && data.primaryCharacterName) {
      charNameInput.value = data.primaryCharacterName
    }
    
    // Populate Availability if not already filled
    const availabilityInput = document.getElementById('fetcher-pst')
    if (availabilityInput && !availabilityInput.value && data.primaryAvailability) {
      availabilityInput.value = data.primaryAvailability
    }
    
    // Revalidate form after population
    validateForm()
  } catch (error) {
    console.warn('[Fetcher] Error loading account settings:', error)
  }
}

/**
 * Save fetcher listing to Firestore
 */
async function saveFetcherListing() {
  const db = Firebase.getFirestore()
  const auth = Firebase.getAuth()
  const errorEl = document.getElementById('fetcher-form-error')
  
  if (!db || !auth?.currentUser) {
    errorEl.textContent = 'You must be signed in'
    errorEl.style.display = 'block'
    return
  }

  errorEl.style.display = 'none'

  const characterName = document.getElementById('fetcher-character-name')?.value.trim() || ''
  const server = document.getElementById('fetcher-server')?.value.trim() || ''
  const pstAvailability = document.getElementById('fetcher-pst')?.value.trim() || ''
  const commission = document.getElementById('fetcher-commission')?.value.trim() || ''
  const description = document.getElementById('fetcher-notes')?.value.trim() || ''

  if (!characterName || !server || !commission) {
    errorEl.textContent = 'Please fill in all required fields (marked with *)'
    errorEl.style.display = 'block'
    return
  }

  try {
    setStatus('status', 'Creating fetcher listing…', 'loading')

    const listingData = {
      type: 'fetcher',
      characterName,
      server,
      pstAvailability: pstAvailability || null,
      commissionRate: commission,
      description: description || null,
      uid: auth.currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      active: true
    }

    await db.collection('listings').add(listingData)
    
    setStatus('status', 'Fetcher listing created successfully!', 'ok')
    
    // Reset form
    document.getElementById('fetcher-listing-form').reset()
    
    setTimeout(() => {
      window.location.href = 'yourListings.html'
    }, 1500)
  } catch (error) {
    console.error('Error saving fetcher listing:', error)
    errorEl.textContent = 'Error: ' + error.message
    errorEl.style.display = 'block'
    setStatus('status', 'Error creating listing', 'error')
  }
}

/**
 * Create nail image element
 */
function createNail() {
  const formWrapper = document.getElementById('form-wrapper')
  if (!formWrapper) return
  
  const nailImg = document.createElement('img')
  nailImg.src = getRandomNail()
  nailImg.alt = 'nail'
  nailImg.id = 'form-nail'
  nailImg.className = 'form-nail'
  nailImg.style.cssText = 'width: 5vw; height: 5vw; ' + getNailPositionStyle()
  formWrapper.insertBefore(nailImg, formWrapper.firstChild)
}

// Initialize when page loads
initFetcherPage()
