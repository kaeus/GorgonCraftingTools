/**
 * Firebase Initialization Module
 * Centralizes Firebase setup and configuration
 */

let db = null
let auth = null

export function getFirestore() {
  return db
}

export function getAuth() {
  return auth
}

export function initializeFirebase(config) {
  if (!config.apiKey || config.apiKey.startsWith('REPLACE')) {
    console.error('Firebase is not configured. Edit firebase-config.js with your project details.')
    return false
  }

  firebase.initializeApp(config)
  db = firebase.firestore()
  auth = firebase.auth()
  
  return true
}

export function onAuthStateChanged(callback) {
  if (!auth) {
    console.error('Firebase not initialized')
    return null
  }
  return auth.onAuthStateChanged(callback)
}

export function signOutUser() {
  return auth.signOut()
}

export async function createUserWithEmail(email, password, displayName = null) {
  const credential = await auth.createUserWithEmailAndPassword(email, password)
  if (displayName) {
    await credential.user.updateProfile({ displayName })
  }
  return credential.user
}

export function signInWithEmail(email, password) {
  return auth.signInWithEmailAndPassword(email, password)
}

export function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider()
  return auth.signInWithPopup(provider)
}

export async function getCurrentUser() {
  // Wait for auth state to be determined
  return new Promise((resolve) => {
    if (!auth) {
      console.error('Firebase not initialized')
      resolve(null)
      return
    }
    
    // If user is already loaded, return immediately
    if (auth.currentUser) {
      resolve(auth.currentUser)
      return
    }
    
    // Otherwise wait for auth state to change
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe()
      resolve(user)
    })
  })
}
