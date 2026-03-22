/**
 * Account Setup Module
 * Ensures users complete their account profile before accessing the site
 */

import { getFirestore, onAuthStateChanged } from './firebase.js'

const SETUP_COMPLETE_KEY = 'accountSetupComplete'

/**
 * Check if the user's account setup is complete
 * Returns true if all required fields are filled
 */
export async function isAccountSetupComplete(user) {
  if (!user) {
    console.log('No user, account setup not required')
    return false
  }

  try {
    const db = getFirestore()
    if (!db) {
      console.warn('Firestore not available')
      return false
    }

    const userDoc = await db.collection('users').doc(user.uid).get()
    if (!userDoc.exists) {
      console.log('No user document exist, account setup required')
      return false
    }

    const data = userDoc.data()
    const isComplete = !!(
      data.primaryCharacterName &&
      data.primaryServer &&
      data.primaryAvailability &&
      data.primaryCharacterName.trim() &&
      data.primaryServer.trim() &&
      data.primaryAvailability.trim()
    )
    
    console.log('Account setup status:', isComplete ? 'complete' : 'incomplete', data)
    return isComplete
  } catch (error) {
    console.error('Error checking account setup:', error)
    return false
  }
}

/**
 * Redirect to account settings if account is not set up
 * Call this early in the app initialization
 */
export async function ensureAccountSetup() {
  // Don't check on account-settings page or on pages without auth
  const currentPath = window.location.pathname
  const isAccountSettingsPage = currentPath.includes('account-settings.html')
  
  console.log('[AccountSetup] Checking account setup on path:', currentPath)
  
  if (isAccountSettingsPage) {
    console.log('[AccountSetup] On account-settings page, skipping check')
    return // Already on setup page, don't redirect
  }

  // Wait a moment for Firebase to initialize
  await new Promise(resolve => setTimeout(resolve, 500))

  // Wait for auth state to be determined
  return new Promise((resolve) => {
    try {
      const unsubscribe = onAuthStateChanged(async (user) => {
        console.log('[AccountSetup] Auth state changed, user:', user ? user.uid : 'null')
        
        if (!user) {
          // Not logged in, allow access (they'll see sign-in prompts)
          console.log('[AccountSetup] User not logged in, allowing access')
          unsubscribe()
          resolve()
          return
        }

        const setupComplete = await isAccountSetupComplete(user)
        console.log('[AccountSetup] Setup complete:', setupComplete)
        
        if (!setupComplete) {
          // Store the page they came from so we can redirect back after setup
          const currentPath = window.location.pathname
          const query = window.location.search
          sessionStorage.setItem('accountSetupRedirectPath', currentPath + query || './yourListings.html')
          
          console.log('[AccountSetup] Account setup not complete, redirecting to account-settings')
          window.location.href = './account-settings.html'
        }
        unsubscribe()
        resolve()
      })
    } catch (error) {
      console.error('[AccountSetup] Error checking account setup:', error)
      resolve()
    }
  })
}

/**
 * Show a blocking message when account setup is not complete
 */
export function showAccountSetupBlocker() {
  console.log('showAccountSetupBlocker called - showing account setup message')
  
  // Hide body content
  document.body.style.visibility = 'visible' // Make visible first so blocker is visible
  
  // Create blocker overlay
  const blocker = document.createElement('div')
  blocker.id = 'account-setup-blocker'
  blocker.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  `
  
  blocker.innerHTML = `
    <div style="
      background-color: #2a2a2a;
      border: 2px solid #8B7355;
      border-radius: 8px;
      padding: 3rem;
      max-width: 600px;
      text-align: center;
      color: #d6c3a3;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
    ">
      <h2 style="
        font-size: 1.8rem;
        margin-bottom: 1.5rem;
        color: #d6c3a3;
        font-family: Georgia, serif;
      ">Before You Access This Feature</h2>
      
      <p style="
        font-size: 1rem;
        margin-bottom: 2rem;
        line-height: 1.6;
        color: #b8a78a;
      ">
        You must configure your account settings before using the site.
      </p>
      
      <p style="
        font-size: 0.9rem;
        margin-bottom: 2rem;
        color: #888;
      ">
        Please complete the following on your Account Settings page:
      </p>
      
      <ul style="
        text-align: left;
        display: inline-block;
        margin-bottom: 2rem;
        color: #d6c3a3;
      ">
        <li style="margin-bottom: 0.5rem;">✓ Primary Character Name</li>
        <li style="margin-bottom: 0.5rem;">✓ Primary Server</li>
        <li style="margin-bottom: 0.5rem;">✓ Primary Availability</li>
        <li style="color: #888;">(Profile Picture is optional)</li>
      </ul>
      
      <div style="display: flex; gap: 1rem; margin-top: 2rem; justify-content: center;">
        <a href="./account-settings.html" class="action-btn" style="
          padding: 0.75rem 2rem;
          background-color: #8B7355;
          color: #d6c3a3;
          text-decoration: none;
          border-radius: 3px;
          border: 1px solid #a8956d;
          cursor: pointer;
          font-size: 1rem;
          display: inline-block;
          transition: background-color 0.2s;
        " onmouseover="this.style.backgroundColor='#a0845f'" onmouseout="this.style.backgroundColor='#8B7355'">
          Go to Account Settings
        </a>
      </div>
    </div>
  `
  
  document.body.appendChild(blocker)
  console.log('Account setup blocker added to DOM')
}

/**
 * Prevent navigation away from account-settings without completing setup
 */
export function setupNavigationGuard() {
  const currentPath = window.location.pathname
  const isAccountSettingsPage = currentPath.includes('account-settings.html')

  if (!isAccountSettingsPage) return

  // Check if setup is complete before allowing navigation
  window.addEventListener('beforeunload', (e) => {
    const characterName = document.getElementById('primary-character-name')?.value?.trim()
    const server = document.getElementById('primary-server')?.value?.trim()
    const availability = document.getElementById('primary-availability')?.value?.trim()

    // If any required field is empty, warn the user
    if (!characterName || !server || !availability) {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
  })

  // Handle link clicks - show popup if setup not complete
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a')
    if (!link) return

    const href = link.getAttribute('href')
    // Allow links to account-settings itself
    if (href === '#' || href === 'account-settings.html' || href?.startsWith('#')) {
      return
    }

    const characterName = document.getElementById('primary-character-name')?.value?.trim()
    const server = document.getElementById('primary-server')?.value?.trim()
    const availability = document.getElementById('primary-availability')?.value?.trim()

    // If any required field is empty, prevent navigation and show popup
    if (!characterName || !server || !availability) {
      e.preventDefault()
      e.stopPropagation()
      showAccountSetupRequiredPopup()
      return false
    }
  })
}

/**
 * Show popup explaining that account setup is required
 */
function showAccountSetupRequiredPopup() {
  // Create a simple popup/modal
  const popup = document.createElement('div')
  popup.className = 'modal-backdrop'
  popup.style.display = 'flex'
  popup.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <h3>Account Setup Required</h3>
      <p>Before you can access the site, you must complete your account settings:</p>
      <ul style="margin: 1rem 0; padding-left: 1.5rem; color: #d6c3a3;">
        <li>Primary Character Name</li>
        <li>Primary Server</li>
        <li>Primary Availability</li>
      </ul>
      <p style="color: #888; font-size: 0.9rem; margin-top: 1rem;">Profile Picture is optional.</p>
      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button class="action-btn" onclick="this.closest('.modal-backdrop').remove()" style="flex: 1;">
          Understood, Let Me Complete Setup
        </button>
      </div>
    </div>
  `

  document.body.appendChild(popup)

  // Close when clicking the backdrop
  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.remove()
    }
  })
}
