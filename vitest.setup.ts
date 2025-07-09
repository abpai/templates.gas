import { vi } from 'vitest'

/*
 * Provide minimal mocks for Google Apps Script global services so that source
 * files can be imported in a Node/Vitest environment without errors. Only the
 * methods actually used in the codebase are implemented; extend them as
 * needed in the future.
 */

type GASGlobal = typeof globalThis & Record<string, unknown>
const g = globalThis as GASGlobal

/**
 * Add a property to `globalThis` if it is still undefined. Keeps the mocking
 * code DRY and ensures idempotency when Vitest reloads the environment.
 */
const ensure = (key: string, factory: () => unknown) => {
  if (typeof g[key] === 'undefined') {
    g[key] = factory()
  }
}

// ----- Logger ---------------------------------------------------------------
ensure('Logger', () => ({
  log: vi.fn(),
}))

// ----- SpreadsheetApp -------------------------------------------------------
ensure('SpreadsheetApp', () => {
  const uiChainable = {
    addItem: vi.fn().mockReturnThis(),
    addSeparator: vi.fn().mockReturnThis(),
    addToUi: vi.fn().mockReturnThis(),
    alert: vi.fn(),
    ButtonSet: { OK: 'OK' },
  }

  // Point createMenu back to the same chainable so calls can be chained.
  const createMenu = vi.fn(() => uiChainable)

  return {
    getActiveSpreadsheet: vi.fn(() => ({
      getName: vi.fn(() => 'Mock Spreadsheet'),
    })),
    getUi: vi.fn(() => ({ ...uiChainable, createMenu })),
  }
})

// ----- DriveApp -------------------------------------------------------------
ensure('DriveApp', () => ({
  getFiles: vi.fn(() => {
    let index = 0
    const files = [{ getName: () => 'File 1' }, { getName: () => 'File 2' }]
    return {
      hasNext: () => index < files.length,
      next: () => files[index++],
    }
  }),
}))

// ----- DocumentApp ----------------------------------------------------------
ensure('DocumentApp', () => ({
  create: vi.fn(() => {
    const body = { setText: vi.fn() }
    return {
      getBody: () => body,
      saveAndClose: vi.fn(),
      getId: vi.fn(() => 'mock-doc-id'),
    }
  }),
}))

export {}
