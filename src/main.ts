/**
 * A sample function that shows a toast message.
 */
export const helloWorld = (): void => {
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Hello from the template!',
    'Success',
  )
}

/**
 * A server-side function that can be called from the client-side UI.
 * @param name A name to greet.
 * @returns A greeting message.
 */
export const getGreetingFromServer = (name: string): string => {
  Logger.log(`getGreetingFromServer called with name: ${name}`)
  return `Hello, ${name}! The time is ${new Date().toLocaleTimeString()}`
}
