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
  bell: [
    "Ring ring! Welcome, traveler!",
    "Ding dong! Another adventurer arrives.",
    "I've been ringing for ages... anyone listening?",
    "Bong! That one was for free.",
    "They say every bell toll brings luck.",
    "Listen closely... the chimes carry secrets.",
    "A bell's duty is never done.",
    "Toll... toll... who goes there?",
    "Need directions? Follow the sound!",
    "I ring for celebrations and warnings alike.",
    "One toll for friend, two for foe.",
    "The wind carries my voice far and wide.",
    "Some say bells ward off dark spirits.",
    "Can you hear me now? Good.",
    "Chime in, won't you?",
    "Another page, another toll.",
    "I've seen every corner of this place.",
    "Clang! Oh, pardon me.",
    "Ring once if you need help!",
    "The bell tolls for thee, adventurer.",
  ],
  // Additional NPCs can be added here in the future
  // artisanAlley: [...],
  // crookedColiseum: [...],

  marketAnnoyed: [
    "Stop.",
    "Stop!",
    "Shhhhhhhhhh",
    "I Heard You Already",
    "I'll Cut You",
    "Enough.",
    "You're Testing Me",
    "I. Am. Right. Here.",
    "Do Not Do That Again",
    "Once Is Sufficient",
    "I Do Not Like Repetition",
    "Your Hands Will Go Missing",
    "Patience Is A Skill You Lack",
    "I Am Not Deaf",
    "Continue And Regret It",
    "That Sound Annoys Me",
    "This Is How You Lose Fingers",
    "I Am Trying To Be Civil",
  ],

  marketGoodbye: [
    "Bye!",
    "Goodbye.",
    "Leave.",
    "We Are Finished",
    "Do Not Linger",
    "Go Now",
    "This Interaction Is Over",
    "Do Not Call Me Again",
    "I Will Be Watching",
    "Walk Away",
    "Do Not Turn Back",
    "Our Business Concludes",
    "Disappear",
    "I Expect Silence Now",
    "That Is Enough Of You",
    "Return Only If Necessary",
    "You May Go",
    "Try Not To Return",
    "I Have Other Matters",
    "Do Not Make Me Repeat Myself",
    "Next Time Will Cost You",
  ],
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
