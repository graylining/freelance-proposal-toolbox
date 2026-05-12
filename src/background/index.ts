import {
  ALARM_NAME,
  AUTO_SCRAPE_COOLDOWN_MIN,
  STORAGE_KEYS,
} from '../shared/constants'
import { API_BASE } from '../shared/api'
import type { ScrapedProfile } from '../shared/profileTypes'

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
    sendToTab(msg.tabId, { type: 'SCRAPE_JOB_REQUEST' })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err?.message ?? 'unknown error' }),
      )
    return true
  }

  if (msg?.type === 'SYNC_PROFILE' && typeof msg.tabId === 'number') {
    syncProfile(msg.tabId)
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) =>
        sendResponse({ ok: false, error: err?.message ?? 'unknown error' }),
      )
    return true
  }

  return false
})

async function sendToTab<T = unknown>(
  tabId: number,
  message: unknown,
): Promise<T> {
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as T
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!/Receiving end does not exist|Could not establish connection/i.test(msg)) {
      throw err
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    })
    return (await chrome.tabs.sendMessage(tabId, message)) as T
  }
}

async function syncProfile(tabId: number): Promise<{
  syncedAt: number
  profile: ScrapedProfile
}> {
  const profile = await sendToTab<ScrapedProfile>(tabId, {
    type: 'SCRAPE_PROFILE_REQUEST',
  })
  if (!profile?.upworkId) {
    throw new Error('Could not detect Upwork profile id on this page')
  }

  const res = await fetch(`${API_BASE}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upworkId: profile.upworkId,
      profileUrl: profile.profileUrl,
      data: profile,
    }),
  })
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`)
  }
  const json = (await res.json()) as { syncedAt: number }

  await chrome.storage.local.set({
    [STORAGE_KEYS.profile]: profile,
    [STORAGE_KEYS.profileSyncedAt]: json.syncedAt,
  })

  return { syncedAt: json.syncedAt, profile }
}

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
