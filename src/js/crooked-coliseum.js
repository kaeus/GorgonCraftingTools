/**
 * Crooked Coliseum - Sports Betting Tracker
 * Tracks fight odds, tips, and featured matchups for the Crooked Coliseum.
 *
 * Firestore document key: "{server}:{date}"
 * Date rolls to the next day after 4AM GMT.
 */

export const FIGHTERS = ['Corrak', 'Dura', 'Gloz', 'Leo', 'Otis', 'Ushug', 'Vizlark']

// ── Module State ────────────────────────────────────────────────────────────

let tips = {
  globalAdvantages: {},   // { fighterName: boolean }
  globalDisadvantages: {}, // { fighterName: boolean }
  fightAdvantages: {}     // { "fighterA:fighterB": boolean }
}

let currentServer = ''
let currentUser = null
let unsubscribeTips = null
let rolloverTimer = null

// ── Date Logic ───────────────────────────────────────────────────────────────

/**
 * Returns the coliseum "day" date string.
 * After 4AM GMT the day rolls over to tomorrow.
 */
function getColiseumDate() {
  const now = new Date()
  if (now.getUTCHours() < 4) {
    const tomorrow = new Date(now)
    tomorrow.setUTCDate(tomorrow.getUTCDate() - 1)
    return tomorrow.toISOString().split('T')[0]
  }
  return now.toISOString().split('T')[0]
}

function getDocumentKey(server) {
  return `${server}:${getColiseumDate()}`
}

// ── Odds Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates the win chance percentage for `fighter` against `opponent`.
 *
 * Formula (offset from 50%):
 *   +5  if fighter has Global Advantage
 *   -5  if fighter has Global Disadvantage
 *   +10 if fighter has Fight Advantage over opponent
 *   -5  if opponent has Global Advantage
 *   +5  if opponent has Global Disadvantage
 *   -10 if opponent has Fight Advantage over fighter
 *
 * Range: 30%–70% (offset -20 to +20)
 */
function calcOdds(fighter, opponent) {
  const offset =
    (tips.globalAdvantages[fighter]    ?  5 : 0) +
    (tips.globalDisadvantages[fighter] ? -5 : 0) +
    (tips.fightAdvantages[`${fighter}:${opponent}`] ?  10 : 0) +
    (tips.globalAdvantages[opponent]    ? -5 : 0) +
    (tips.globalDisadvantages[opponent] ?  5 : 0) +
    (tips.fightAdvantages[`${opponent}:${fighter}`] ? -10 : 0)
  return 50 + offset
}

function calcAdvantage(fighter, opponent) {
  return calcOdds(fighter, opponent) - 50
}

// ── Rendering ────────────────────────────────────────────────────────────────

function renderOddsGrid() {
  const container = document.getElementById('odds-grid-container')
  if (!container) return

  const rows = FIGHTERS.map(row => {
    const cells = FIGHTERS.map(col => {
      if (row === col) return `<td class="self-cell">—</td>`
      const odds = calcOdds(row, col)
      const adv = odds - 50
      const cls = adv > 0 ? 'odds-positive' : adv < 0 ? 'odds-negative' : 'odds-neutral'
      const sign = adv >= 0 ? '+' : ''
      const bold = odds >= 60 ? ' odds-bold' : ''
      return `<td class="odds-cell ${cls}${bold}" title="${row} vs ${col}: ${odds}% (${sign}${adv}%)">${odds}%<span class="odds-adv">${sign}${adv}</span></td>`
    }).join('')
    return `<tr><td class="fighter-label">${row}</td>${cells}</tr>`
  }).join('')

  container.innerHTML = `
    <div class="odds-grid-scroll">
      <table class="odds-table">
        <thead>
          <tr>
            <th class="corner-cell">↓ vs →</th>
            ${FIGHTERS.map(f => `<th>${f}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="odds-legend">Row fighter vs column fighter. Green = row fighter favored.</p>
  `
}

function renderFeaturedFights() {
  const container = document.getElementById('featured-fights-list')
  if (!container) return

  const featured = []
  for (const f of FIGHTERS) {
    for (const opp of FIGHTERS) {
      if (f === opp) continue
      const adv = calcAdvantage(f, opp)
      if (adv >= 10) featured.push({ fighter: f, opponent: opp, adv })
    }
  }
  featured.sort((a, b) => b.adv - a.adv)

  if (featured.length === 0) {
    container.innerHTML = '<p class="empty-state-small">No fights with +10% or higher advantage yet.</p>'
    return
  }

  container.innerHTML = featured.map(({ fighter, opponent, adv }) => `
    <div class="featured-fight-item">
      <div class="featured-fight-matchup">
        <span class="featured-fighter">${fighter}</span>
        <span class="featured-vs">vs</span>
        <span class="featured-opponent">${opponent}</span>
      </div>
      <span class="featured-adv">+${adv}%</span>
    </div>
  `).join('')
}

function renderFighterSelector() {
  const container = document.getElementById('fighter-selector')
  if (!container) return

  container.innerHTML = `
    <div class="fighter-chips-row">
      <div class="fighter-chips" id="fighter-chips"></div>
      <button class="action-btn ghost fighter-reset-btn" id="fighter-reset-btn" style="display:none;">Reset</button>
    </div>
    <div id="fight-result" class="fight-result">
      <p class="fight-result-hint">Select two fighters to compare odds</p>
    </div>
  `

  const chips = container.querySelector('#fighter-chips')
  const resetBtn = container.querySelector('#fighter-reset-btn')
  chips.innerHTML = FIGHTERS.map(f =>
    `<button class="fighter-chip" data-fighter="${f}">${f}</button>`
  ).join('')

  let selected = []

  function clearSelection() {
    selected = []
    chips.querySelectorAll('.fighter-chip.selected').forEach(c => c.classList.remove('selected'))
    resetBtn.style.display = 'none'
    updateFightResult(selected)
  }

  resetBtn.addEventListener('click', clearSelection)

  chips.querySelectorAll('.fighter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const fighter = btn.dataset.fighter
      const idx = selected.indexOf(fighter)
      if (idx >= 0) {
        selected.splice(idx, 1)
        btn.classList.remove('selected')
      } else {
        if (selected.length >= 2) {
          const removed = selected.shift()
          chips.querySelector(`[data-fighter="${removed}"]`)?.classList.remove('selected')
        }
        selected.push(fighter)
        btn.classList.add('selected')
      }
      resetBtn.style.display = selected.length >= 2 ? '' : 'none'
      updateFightResult(selected)
    })
  })
}

function updateFightResult(selected) {
  const result = document.getElementById('fight-result')
  if (!result) return

  if (selected.length < 2) {
    result.innerHTML = '<p class="fight-result-hint">Select two fighters to compare odds</p>'
    return
  }

  const [a, b] = selected
  const oddsA = calcOdds(a, b)
  const advA = oddsA - 50
  const oddsB = calcOdds(b, a)
  const advB = oddsB - 50

  const isTie = advA === 0 && advB === 0

  // Always put the winner on the left
  const [left, right, oddsLeft, oddsRight] = advA >= advB
    ? [a, b, oddsA, oddsB]
    : [b, a, oddsB, oddsA]

  result.innerHTML = `
    <div class="fight-result-display">
      <div class="result-slot ${isTie ? 'neutral' : 'winner'}">
        <img class="result-fighter-img" src="/images/fighters/${left}.png" alt="${left}">
        <span class="result-fighter-name">${left}</span>
        <span class="result-fighter-sub">${oddsLeft}%</span>
      </div>
      <div class="result-center">
        ${isTie
          ? `<span class="result-odds-label">50 / 50</span>
             <span class="result-tie-label">Even match</span>`
          : `<span class="result-adv-badge">+${Math.max(advA, advB)}%</span>
             <span class="result-favored-over">advantage</span>`
        }
      </div>
      <div class="result-slot ${isTie ? 'neutral' : 'loser'}">
        <img class="result-fighter-img" src="/images/fighters/${right}.png" alt="${right}">
        <span class="result-fighter-name">${right}</span>
        <span class="result-fighter-sub">${oddsRight}%</span>
      </div>
    </div>
  `
}

function updateTipsBadge() {
  const badge = document.getElementById('tips-count-badge')
  if (!badge) return
  const count =
    Object.values(tips.globalAdvantages).filter(Boolean).length +
    Object.values(tips.globalDisadvantages).filter(Boolean).length +
    Object.values(tips.fightAdvantages).filter(Boolean).length
  if (count > 0) {
    badge.textContent = `${count} tip${count === 1 ? '' : 's'}`
    badge.style.display = ''
  } else {
    badge.style.display = 'none'
  }
}

function renderAll() {
  renderOddsGrid()
  renderFeaturedFights()
  updateTipsBadge()
  // Re-render selector so chips reset to deselected state on data updates
  renderFighterSelector()
}

// ── Tips Modal ────────────────────────────────────────────────────────────────

export function openTipsModal() {
  if (!currentUser) {
    alert('You must be signed in to configure tips.')
    return
  }
  renderTipsModal()
  document.getElementById('tips-modal')?.classList.add('open')
}

function closeTipsModal() {
  document.getElementById('tips-modal')?.classList.remove('open')
}

function renderTipsModal() {
  const advContainer = document.getElementById('tips-global-adv')
  if (advContainer) {
    advContainer.innerHTML = FIGHTERS.map(f => `
      <label class="tip-checkbox-label">
        <input type="checkbox" class="tip-checkbox" data-type="globalAdv" data-fighter="${f}"
          ${tips.globalAdvantages[f] ? 'checked' : ''}>
        <span class="tip-fighter-name">${f}</span>
      </label>
    `).join('')
  }

  const disContainer = document.getElementById('tips-global-dis')
  if (disContainer) {
    disContainer.innerHTML = FIGHTERS.map(f => `
      <label class="tip-checkbox-label">
        <input type="checkbox" class="tip-checkbox" data-type="globalDis" data-fighter="${f}"
          ${tips.globalDisadvantages[f] ? 'checked' : ''}>
        <span class="tip-fighter-name">${f}</span>
      </label>
    `).join('')
  }

  const fightContainer = document.getElementById('tips-fight-adv')
  if (fightContainer) {
    fightContainer.innerHTML = FIGHTERS.map(fighter => `
      <div class="fight-adv-group">
        <div class="fight-adv-fighter-label">${fighter}</div>
        <div class="fight-adv-opponents">
          ${FIGHTERS.filter(opp => opp !== fighter).map(opp => `
            <label class="tip-checkbox-label">
              <input type="checkbox" class="tip-checkbox" data-type="fightAdv"
                data-fighter="${fighter}" data-opponent="${opp}"
                ${tips.fightAdvantages[`${fighter}:${opp}`] ? 'checked' : ''}>
              <span class="tip-matchup">${fighter} &gt; ${opp}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('')
  }
}

async function saveTips() {
  if (!currentServer || !currentUser) return

  const db = window.firebase?.firestore?.()
  if (!db) return

  const key = getDocumentKey(currentServer)
  try {
    await db.collection('coliseum').doc(key).set({
      globalAdvantages: tips.globalAdvantages,
      globalDisadvantages: tips.globalDisadvantages,
      fightAdvantages: tips.fightAdvantages,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.uid
    }, { merge: true })
  } catch (err) {
    console.error('Failed to save tips:', err)
  }
}

function handleTipsCheckboxChange(e) {
  if (!e.target.matches('.tip-checkbox')) return
  const { type, fighter, opponent } = e.target.dataset
  const checked = e.target.checked

  if (type === 'globalAdv') {
    tips.globalAdvantages[fighter] = checked
  } else if (type === 'globalDis') {
    tips.globalDisadvantages[fighter] = checked
  } else if (type === 'fightAdv') {
    tips.fightAdvantages[`${fighter}:${opponent}`] = checked
  }

  saveTips()
  renderOddsGrid()
  renderFeaturedFights()
  updateTipsBadge()
}

// ── Date Rollover ─────────────────────────────────────────────────────────────

function scheduleDateRollover() {
  if (rolloverTimer) clearTimeout(rolloverTimer)
  if (!currentServer) return

  const now = new Date()
  const next4am = new Date(now)
  next4am.setUTCHours(4, 0, 0, 0)
  if (now.getUTCHours() >= 4) next4am.setUTCDate(next4am.getUTCDate() + 1)

  rolloverTimer = setTimeout(() => {
    subscribeToTips(currentServer)
  }, next4am - now)
}

// ── Firebase Subscription ────────────────────────────────────────────────────

function subscribeToTips(server) {
  if (unsubscribeTips) {
    unsubscribeTips()
    unsubscribeTips = null
  }
  if (!server) return

  const db = window.firebase?.firestore?.()
  if (!db) return

  const key = getDocumentKey(server)
  const statusEl = document.getElementById('coliseum-status')

  scheduleDateRollover()

  unsubscribeTips = db.collection('coliseum').doc(key).onSnapshot(
    doc => {
      if (doc.exists) {
        const data = doc.data()
        tips.globalAdvantages   = data.globalAdvantages   || {}
        tips.globalDisadvantages = data.globalDisadvantages || {}
        tips.fightAdvantages    = data.fightAdvantages    || {}
      } else {
        tips = { globalAdvantages: {}, globalDisadvantages: {}, fightAdvantages: {} }
      }
      renderAll()
      setContentVisible(true)
      // Keep modal in sync if it's open
      if (document.getElementById('tips-modal')?.classList.contains('open')) {
        renderTipsModal()
      }
      if (statusEl) {
        statusEl.className = 'status-bar'
        statusEl.style.display = 'none'
      }
    },
    err => {
      console.error('Tips subscription error:', err)
      if (statusEl) {
        statusEl.textContent = 'Error loading tips data.'
        statusEl.className = 'status-bar error'
        statusEl.style.display = ''
      }
    }
  )
}

// ── Server Selection ─────────────────────────────────────────────────────────

function setContentVisible(visible) {
  const content = document.getElementById('coliseum-content')
  const placeholder = document.getElementById('coliseum-no-server')
  if (content) content.style.display = visible ? '' : 'none'
  if (placeholder) placeholder.style.display = visible ? 'none' : ''
}

function handleServerChange(server) {
  currentServer = server
  localStorage.setItem('preferred-server', server)

  const statusEl = document.getElementById('coliseum-status')

  if (server) {
    setContentVisible(false) // hide until data loads
    if (statusEl) {
      statusEl.textContent = 'Loading…'
      statusEl.className = 'status-bar loading'
      statusEl.style.display = ''
    }
    subscribeToTips(server)
  } else {
    if (unsubscribeTips) { unsubscribeTips(); unsubscribeTips = null }
    if (rolloverTimer) { clearTimeout(rolloverTimer); rolloverTimer = null }
    tips = { globalAdvantages: {}, globalDisadvantages: {}, fightAdvantages: {} }
    setContentVisible(false)
    if (statusEl) statusEl.style.display = 'none'
  }
}

// ── Auth State ────────────────────────────────────────────────────────────────

export function setCurrentUser(user) {
  currentUser = user
  const btn = document.getElementById('configure-tips-btn')
  if (!btn) return
  if (user) {
    btn.removeAttribute('disabled')
    btn.title = 'Configure betting tips'
  } else {
    btn.setAttribute('disabled', 'true')
    btn.title = 'Sign in to configure tips'
  }
}

// ── Initialization ────────────────────────────────────────────────────────────

export function initColiseum() {
  // Restore server preference
  const saved = localStorage.getItem('preferred-server')
  const serverSelect = document.getElementById('coliseum-server-filter')
  if (serverSelect) {
    if (saved) {
      serverSelect.value = saved
      currentServer = saved
    }
    serverSelect.addEventListener('change', e => handleServerChange(e.target.value))
  }

  // Configure Tips button
  document.getElementById('configure-tips-btn')?.addEventListener('click', openTipsModal)

  // Modal close button
  document.getElementById('tips-modal-close')?.addEventListener('click', closeTipsModal)

  // Modal backdrop click to close
  document.getElementById('tips-modal')?.addEventListener('click', e => {
    if (e.target.id === 'tips-modal') closeTipsModal()
  })

  // Checkbox changes (delegated to modal body)
  document.getElementById('tips-modal-body')?.addEventListener('change', handleTipsCheckboxChange)

  if (currentServer) {
    // Server already saved — pre-render grid then load live data
    renderAll()
    setContentVisible(false) // hide until snapshot arrives
    const statusEl = document.getElementById('coliseum-status')
    if (statusEl) {
      statusEl.textContent = 'Loading…'
      statusEl.className = 'status-bar loading'
      statusEl.style.display = ''
    }
    subscribeToTips(currentServer)
  } else {
    // No server selected yet — show placeholder
    setContentVisible(false)
  }
}
