/**
 * NPC Dialogue System
 * Centralized dialogue data for NPC interactions, organized by NPC/location
 */

/**
 * Dialogue options for each NPC/location
 * Each NPC has an array of dialogue lines that can be randomly selected
 */
export const npcDialogues = {
  market: [
    "Welcome to the Black Wing Market.",
    "What Market?",
    "Rare Goods, Questionable Prices",
    "You Ask Too Many Questions",
    "Please Mind Your Fingers While Counting Coins. *Snick*",
    "Well... Time to Fetch Dr. Mantis Toboggan",
    "Complain Loudly and Become the Meat Stall",
    "You Didn't See Us.",
    "One Meatman's Treasure is Another Meatman's Treasure",
    "Shhhhhhhhhhhhhh.",
    "If You Feel Fleeced, You Were.",
    "Steal Once, Limp Forever.",
    "Barter Hard. We Respect Courage.",
    "Mind Your Coins. Mind Your Limbs.",
    "Back for More... Interesting Wares?",
    "Looking for Something Rare?",
    "Hmm... I Don't See That Item Listed.",
    "Ah, A Fine Choice.",
    "Ah... A Rare Find Indeed.",
    "A New Offering Appears in the Shadows.",
    "A Wise Acquisition.",
    "The Deal is Sealed.",
    "The Networks Whisper... Everything Has a Price.",
    "Discretion is Our Greatest Commodity Here.",
    "Need Something Found? We Have... Specialists.",
    "Excellent Choice. Our People Are Quite Resourceful.",
    "Give Me a Moment... I'm Counting Coin.",
    "I'm Watching... Always Watching.",
    "Some Secrets Are Better Left in Shadow.",
  ],
  // Additional NPCs can be added here in the future
  // artisanAlley: [...],
  // crookedColiseum: [...],
}

/**
 * Get a random dialogue from a specific NPC's dialogue pool
 * @param {string} npcLocation - The location/NPC identifier (e.g., 'market')
 * @returns {string} - A random dialogue line from that NPC's pool
 */
export function getRandomDialogue(npcLocation = 'market') {
  const dialogues = npcDialogues[npcLocation]
  if (!dialogues || dialogues.length === 0) {
    return npcDialogues.market[0] // Fallback to first market dialogue
  }
  return dialogues[Math.floor(Math.random() * dialogues.length)]
}

/**
 * Get all dialogues for a specific NPC
 * @param {string} npcLocation - The location/NPC identifier
 * @returns {array} - Array of all dialogue lines for that NPC
 */
export function getAllDialogues(npcLocation = 'market') {
  return npcDialogues[npcLocation] || npcDialogues.market
}
