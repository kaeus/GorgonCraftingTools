/**
 * Authentication Module
 * Handles user auth UI and interactions
 */

import * as Firebase from './firebase.js'
import { showModalError, clearModalError } from './utils.js'

let emailMode = 'signin' // 'signin' | 'register'

/**
 * Initialize auth modal handlers
 */
export function initAuthModal() {
  // Set initial email mode
  emailMode = 'signin'
}

/**
 * Open auth modal
 */
export function openAuthModal() {
  const modal = document.getElementById('auth-modal')
  if (modal) modal.classList.add('open')
}

/**
 * Close auth modal
 */
export function closeAuthModal() {
  const modal = document.getElementById('auth-modal')
  if (modal) modal.classList.remove('open')
  clearAuthModal()
}

/**
 * Clear auth modal inputs and errors
 */
function clearAuthModal() {
  document.getElementById('auth-email').value = ''
  document.getElementById('auth-password').value = ''
  document.getElementById('auth-name').value = ''
  clearModalError('google-error')
  clearModalError('email-error')
}

/**
 * Switch between Google and Email tabs
 */
export function switchTab(tab) {
  document.getElementById('pane-google').style.display = tab === 'google' ? 'block' : 'none'
  document.getElementById('pane-email').style.display = tab === 'email' ? 'block' : 'none'
  
  document.getElementById('tab-google').classList.toggle('active', tab === 'google')
  document.getElementById('tab-email').classList.toggle('active', tab === 'email')
}

/**
 * Toggle between sign-in and register modes
 */
export function toggleEmailMode() {
  emailMode = emailMode === 'signin' ? 'register' : 'signin'
  
  const isReg = emailMode === 'register'
  document.getElementById('email-name-wrap').style.display = isReg ? 'block' : 'none'
  document.getElementById('toggle-text').textContent = isReg ? 'Already have an account?' : 'Don\'t have an account?'
  document.getElementById('email-submit').textContent = isReg ? 'Register' : 'Sign In'
  
  clearModalError('email-error')
}

/**
 * Sign in with Google
 */
export async function signInGoogle() {
  const errEl = document.getElementById('google-error')
  clearModalError('google-error')

  try {
    await Firebase.signInWithGoogle()
    closeAuthModal()
  } catch (error) {
    showModalError('google-error', error.message)
  }
}

/**
 * Sign in or register with email
 */
export async function signInEmail() {
  const errEl = document.getElementById('email-error')
  const email = document.getElementById('auth-email').value.trim()
  const password = document.getElementById('auth-password').value
  
  clearModalError('email-error')

  if (!email || !password) {
    showModalError('email-error', 'Email and password required')
    return
  }

  try {
    if (emailMode === 'register') {
      const name = document.getElementById('auth-name').value.trim()
      if (!name) {
        showModalError('email-error', 'Display name required')
        return
      }
      await Firebase.createUserWithEmail(email, password, name)
      localStorage.setItem('inGameName', name)
    } else {
      await Firebase.signInWithEmail(email, password)
    }
    closeAuthModal()
  } catch (error) {
    showModalError('email-error', error.message)
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    await Firebase.signOutUser()
  } catch (error) {
    console.error('Error signing out:', error)
  }
}

/**
 * Render user chip/auth prompt
 */
export function renderUserAuth(user) {
  const slot = document.getElementById('user-auth-slot')
  if (!slot) return

  if (user) {
    const inGameName = localStorage.getItem('inGameName')
    const displayName = inGameName || user.displayName || user.email || '?'
    const initial = displayName[0].toUpperCase()
    const photoHtml = user.photoURL 
      ? `<img src="${user.photoURL}" alt="">` 
      : initial

    let adminLink = ''
    if (user.uid) {
      const db = Firebase.getFirestore()
      db?.collection('admins').doc(user.uid).get().then(doc => {
        if (doc.exists) {
          adminLink = '<a href="admin.html" style="color:#8b0000; text-decoration:none; font-weight:600; font-size:0.8rem;">↳ Admin</a>'
          const linkEl = document.getElementById('admin-link-slot')
          if (linkEl) linkEl.innerHTML = adminLink
        }
      })
    }

    slot.innerHTML = `
      <div class="user-chip">
        <div class="avatar">${photoHtml}</div>
        <span>${displayName}</span>
        <button class="auth-btn secondary" onclick="signOut()">Sign Out</button>
        <div id="admin-link-slot">${adminLink}</div>
      </div>
    `
  } else {
    slot.innerHTML = '<button class="action-btn" onclick="openAuthModal()">Sign In</button>'
  }
}
