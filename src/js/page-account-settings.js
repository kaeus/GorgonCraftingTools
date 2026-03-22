/**
 * Account Settings Page
 * Handles loading and saving user profile information
 */

import { getFirestore, getCurrentUser } from './firebase.js'
import { setStatus } from './utils.js'

export async function initAccountSettings() {
  const form = document.getElementById('account-settings-form')
  const submitBtn = document.getElementById('settings-submit-btn')
  const errorDiv = document.getElementById('settings-form-error')

  if (!form) return

  // Load existing settings
  await loadAccountSettings()

  // Enable submit button when form changes
  form.addEventListener('change', () => {
    const characterName = document.getElementById('primary-character-name')?.value?.trim()
    const server = document.getElementById('primary-server')?.value?.trim()
    const availability = document.getElementById('primary-availability')?.value?.trim()

    // Enable button only if all required fields are filled
    if (submitBtn) {
      submitBtn.disabled = !(characterName && server && availability)
    }
  })

  form.addEventListener('input', () => {
    const characterName = document.getElementById('primary-character-name')?.value?.trim()
    const server = document.getElementById('primary-server')?.value?.trim()
    const availability = document.getElementById('primary-availability')?.value?.trim()

    // Enable button only if all required fields are filled
    if (submitBtn) {
      submitBtn.disabled = !(characterName && server && availability)
    }
  })

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    await saveAccountSettings()
  })

  // Handle cancel button
  const cancelBtn = form.querySelector('#cancel-btn')
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const characterName = document.getElementById('primary-character-name')?.value?.trim()
      const server = document.getElementById('primary-server')?.value?.trim()
      const availability = document.getElementById('primary-availability')?.value?.trim()

      // If fields are not filled, warn the user
      if (!characterName || !server || !availability) {
        showCancelConfirmation()
      } else {
        // Fields are filled, allow leaving
        window.history.back()
      }
    })
  }
}

export async function loadAccountSettings() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.warn('No user logged in')
      return
    }

    const db = getFirestore()
    if (!db) return

    const userDoc = await db.collection('users').doc(user.uid).get()
    if (!userDoc.exists) {
      console.log('No existing user document')
      return
    }

    const data = userDoc.data()

    // Populate form fields
    const characterNameInput = document.getElementById('primary-character-name')
    const serverInput = document.getElementById('primary-server')
    const availabilityInput = document.getElementById('primary-availability')
    const profilePicturePreview = document.getElementById('profile-picture-preview')

    if (characterNameInput && data.primaryCharacterName) {
      characterNameInput.value = data.primaryCharacterName
    }

    if (serverInput && data.primaryServer) {
      serverInput.value = data.primaryServer
    }

    if (availabilityInput && data.primaryAvailability) {
      availabilityInput.value = data.primaryAvailability
    }

    if (data.profilePictureUrl && profilePicturePreview) {
      profilePicturePreview.innerHTML = `<img src="${data.profilePictureUrl}" alt="Profile Picture">`
    }

    // Update submit button state
    const submitBtn = document.getElementById('settings-submit-btn')
    if (submitBtn && characterNameInput && serverInput && availabilityInput) {
      const filled = characterNameInput.value.trim() && serverInput.value.trim() && availabilityInput.value.trim()
      submitBtn.disabled = !filled
    }
  } catch (error) {
    console.error('Error loading account settings:', error)
  }
}

export async function saveAccountSettings() {
  try {
    const user = await getCurrentUser()
    console.log('[SaveSettings] getCurrentUser() result:', user)
    console.log('[SaveSettings] User UID:', user?.uid)
    console.log('[SaveSettings] User email:', user?.email)
    
    if (!user) {
      showError('You must be signed in to save settings')
      return
    }
    
    if (!user.uid) {
      console.error('[SaveSettings] User has no UID!')
      showError('Error: User ID not available')
      return
    }

    const characterName = document.getElementById('primary-character-name')?.value?.trim()
    const server = document.getElementById('primary-server')?.value?.trim()
    const availability = document.getElementById('primary-availability')?.value?.trim()

    // Validate required fields
    if (!characterName || !server || !availability) {
      showError('Please fill in all required fields')
      return
    }

    const statusDiv = document.getElementById('status')
    if (statusDiv) {
      statusDiv.textContent = 'Saving settings…'
      statusDiv.className = 'status-bar loading'
      statusDiv.style.display = ''
    }

    const db = getFirestore()
    if (!db) {
      showError('Database not initialized')
      return
    }
    
    console.log('[SaveSettings] Firestore instance:', db ? 'available' : 'null')

    // Handle profile picture upload if selected
    let profilePictureUrl = null
    const fileInput = document.getElementById('primary-profile-picture')
    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0]
      const maxSize = 500 * 1024 // 500 KB limit
      
      if (file.size > maxSize) {
        showError(`Profile picture is too large (${(file.size / 1024).toFixed(0)} KB). Please use an image smaller than 500 KB.`)
        return
      }
      
      // For now, we're storing as base64 data URL
      // In production, you might want to use Cloud Storage instead
      profilePictureUrl = await readFileAsDataURL(file)
    }

    // Get existing profile picture URL if no new one was uploaded
    if (!profilePictureUrl) {
      const existingDoc = await db.collection('users').doc(user.uid).get()
      if (existingDoc.exists && existingDoc.data().profilePictureUrl) {
        profilePictureUrl = existingDoc.data().profilePictureUrl
      }
    }

    // Save to Firestore
    const payload = {
      primaryCharacterName: characterName,
      primaryServer: server,
      primaryAvailability: availability,
      updatedAt: new Date(),
    }

    if (profilePictureUrl) {
      payload.profilePictureUrl = profilePictureUrl
    }

    try {
      console.log('[SaveSettings] Attempting to save to /users/' + user.uid)
      console.log('[SaveSettings] Payload:', payload)
      await db.collection('users').doc(user.uid).set(payload, { merge: true })
      console.log('[SaveSettings] Save successful!')
    } catch (error) {
      // If set() fails, try update() as a fallback
      if (error.code === 'permission-denied') {
        console.log('Set failed with permission error, trying update as fallback...')
        try {
          await db.collection('users').doc(user.uid).update(payload)
        } catch (updateError) {
          // If update also fails (doc doesn't exist), try set again
          if (updateError.code === 'not-found') {
            await db.collection('users').doc(user.uid).set(payload)
          } else {
            throw updateError
          }
        }
      } else {
        throw error
      }
    }

    if (statusDiv) {
      statusDiv.textContent = 'Settings saved successfully!'
      statusDiv.className = 'status-bar'
      statusDiv.style.display = ''
    }

    // Redirect to previous page or yourListings after successful save
    setTimeout(() => {
      const redirectPath = sessionStorage.getItem('accountSetupRedirectPath') || './yourListings.html'
      window.location.href = redirectPath
    }, 1000)
  } catch (error) {
    console.error('Error saving account settings:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    showError(`Error saving settings: ${error.message}`)
  }
}

function showError(message) {
  const errorDiv = document.getElementById('settings-form-error')
  if (errorDiv) {
    errorDiv.textContent = message
    errorDiv.style.display = ''
  }

  const statusDiv = document.getElementById('status')
  if (statusDiv) {
    statusDiv.textContent = message
    statusDiv.className = 'status-bar error'
    statusDiv.style.display = ''
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function showCancelConfirmation() {
  const popup = document.createElement('div')
  popup.className = 'modal-backdrop'
  popup.style.display = 'flex'
  popup.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <h3>Leave Without Saving?</h3>
      <p>You have not completed your account setup. The following fields are required:</p>
      <ul style="margin: 1rem 0; padding-left: 1.5rem; color: #d6c3a3;">
        <li>Primary Character Name</li>
        <li>Primary Server</li>
        <li>Primary Availability</li>
      </ul>
      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button class="action-btn" onclick="this.closest('.modal-backdrop').remove()" style="flex: 1;">
          Continue Editing
        </button>
        <button class="action-btn" style="flex: 1; background-color: #5c4a3d;" onclick="window.history.back()">
          Leave Anyway
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
