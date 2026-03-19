/**
 * NPC Dialogue System
 * Centralized dialogue data for NPC interactions
 */

export const dialogue = {
  // Welcome and greeting
  welcome: "Welcome to the Black Wing Market.",
  greetReturn: "Back for more... interesting wares?",
  
  // Search-related
  searchPrompt: "Looking for something rare?",
  noResults: "Hmm... I don't see that item listed.",
  itemFound: "Ah, a fine choice.",
  rareItem: "Ah... a rare find indeed.",
  
  // Marketplace actions
  listingCreated: "A new offering appears in the shadows.",
  purchaseComplete: "A wise acquisition.",
  saleMade: "The deal is sealed.",
  
  // NPC Maxillae specific
  networkTip: "The networks whisper... everything has a price.",
  secrecy: "Discretion is our greatest commodity here.",
  
  // Fetcher-related
  fetcherAvailable: "Need something found? We have... specialists.",
  fetcherHired: "Excellent choice. Our people are quite resourceful.",
  
  // Flavor text
  busy: "Give me a moment... I'm counting coin.",
  watching: "I'm watching... always watching.",
  mysterious: "Some secrets are better left in shadow.",
}

/**
 * Get a random dialogue piece
 * @param {string} category - The dialogue category
 * @returns {string} - The dialogue text
 */
export function getDialogue(category) {
  return dialogue[category] || dialogue.welcome
}

/**
 * Create custom dialogue event
 * @param {string} text - The dialogue text
 * @param {number} duration - Duration in ms to display (default 3000)
 */
export function createCustomDialogue(text, duration = 3000) {
  return { text, duration }
}
