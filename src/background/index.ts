import { ALARM_NAME, AUTO_SCRAPE_COOLDOWN_MIN, STORAGE_KEYS } from '../shared/constants'

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error('[bg] sidePanel setup failed', err))
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'AUTO_SCRAPE_TOGGLE') {
    void toggleAutoScrape(Boolean(msg.enabled))
    sendResponse({ ok: true })
    return true
  }

  if (msg?.type === 'SCRAPE_JOB' && typeof msg.tabId === 'number') {
    chrome.tabs
      .sendMessage(msg.tabId, { type: 'SCRAPE_JOB_REQUEST' })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err?.message ?? 'unknown error' }),
      )
    return true
  }

  return false
})

async function toggleAutoScrape(enabled: boolean) {
  await chrome.storage.local.set({ [STORAGE_KEYS.autoScrape]: enabled })
  if (enabled) {
    const jitter = Math.random() * AUTO_SCRAPE_COOLDOWN_MIN
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: AUTO_SCRAPE_COOLDOWN_MIN + jitter,
      periodInMinutes: AUTO_SCRAPE_COOLDOWN_MIN,
    })
  } else {
    chrome.alarms.clear(ALARM_NAME)
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return
  console.log('[bg] auto-scrape tick', new Date().toISOString())
})
