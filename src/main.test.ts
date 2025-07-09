import { describe, it, expect, vi } from 'vitest'
import { helloWorld } from './main'

// Mock the Google Apps Script global objects
const mockToast = vi.fn()
const mockSpreadsheet = {
  toast: mockToast,
}
const mockSpreadsheetApp = {
  getActiveSpreadsheet: vi.fn(() => mockSpreadsheet),
}

vi.stubGlobal('SpreadsheetApp', mockSpreadsheetApp)

describe('helloWorld', () => {
  it('should show a toast message', () => {
    helloWorld()
    expect(SpreadsheetApp.getActiveSpreadsheet).toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(
      'Hello from the template!',
      'Success',
    )
  })
})
