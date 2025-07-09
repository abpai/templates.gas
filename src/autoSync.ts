import { syncFilesWithJobsTracker } from './jobsTracker'
import { processNextItem } from './processingEngine'
import { getConfig } from './config'

const TRIGGER_HANDLER_FUNCTION = 'autoSyncTrigger'

/**
 * Creates the time-based trigger for auto-syncing.
 */
export const enableAutoSync = (): void => {
  // First, delete any existing triggers to avoid duplicates
  disableAutoSync()

  const config = getConfig()
  ScriptApp.newTrigger(TRIGGER_HANDLER_FUNCTION)
    .timeBased()
    .everyMinutes(config.autoSyncIntervalMinutes)
    .create()

  Logger.log(
    `Auto-sync enabled. Will run every ${config.autoSyncIntervalMinutes} minutes.`,
  )
  SpreadsheetApp.getActiveSpreadsheet().toast('Auto-sync enabled.')
}

/**
 * Deletes all time-based triggers for auto-syncing.
 */
export const disableAutoSync = (): void => {
  const triggers = ScriptApp.getProjectTriggers()
  triggers.forEach((trigger) => {
    if (trigger.getHandlerFunction() === TRIGGER_HANDLER_FUNCTION) {
      ScriptApp.deleteTrigger(trigger)
    }
  })
  Logger.log('Auto-sync disabled.')
  SpreadsheetApp.getActiveSpreadsheet().toast('Auto-sync disabled.')
}

/**
 * The function that is called by the time-based trigger.
 */
export const autoSyncTrigger = (): void => {
  Logger.log('Auto-sync trigger running...')
  syncFilesWithJobsTracker()
  processNextItem()
  Logger.log('Auto-sync trigger finished.')
}
