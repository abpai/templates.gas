# Gemini Developer Guide

This document provides instructions and best practices for developers working with this Google Apps Script template. Its goal is to help you understand the project's architecture and extend it effectively.

## Core Concepts

This template is built around a common automation pattern: **Drive > Process > Sheet**.

1.  **Drive (Input):** A designated folder in Google Drive (`1. Input`) is monitored for new files.
2.  **Process (Logic):** When a new file is detected, a job is created. A processing engine picks up this job and executes custom logic on the file. This is where you will add your unique functionality.
3.  **Sheet (Output):** The status and result of each job (e.g., "Success," "Error") are logged in a Google Sheet ("Jobs Tracker") for monitoring and auditing.

This entire workflow can be run manually from the custom menu or automatically on a time-based trigger.

## Key Files

Your work will primarily be in the `src/` directory. Here are the most important files:

-   `src/processingEngine.ts`: **This is the heart of your application.** The `processFile` function is a placeholder where you should write your custom logic. It receives a Google Drive file as input and should return a string summarizing the result.

-   `src/config.ts`: This file contains all the configuration for the project, such as folder names and trigger intervals. If you need to change the name of a folder or a sheet, this is the place to do it.

-   `src/jobsTracker.ts`: This file manages the "Jobs Tracker" sheet. It handles creating new job entries, finding the next job to process, and updating a job's status. You typically won't need to modify this unless you want to add more columns to the tracker sheet.

-   `src/fileScanner.ts`: This handles the interaction with Google Drive, such as creating the folder structure and scanning for new files.

-   `src/ui.ts`: This file creates the custom "File Processor" menu in the Google Sheet UI and links the menu items to the appropriate functions.

## How to Customize the Template

### 1. Implementing Your Custom Logic

Your primary task is to modify the `processFile` function in `src/processingEngine.ts`.

```typescript
// src/processingEngine.ts

const processFile = (file: GoogleAppsScript.Drive.File): string => {
  // =================================================================
  // TODO: Add your custom processing logic here.
  // This example just reads the file content and logs it.
  // You could parse a CSV, extract text from a PDF, call an AI API, etc.
  // =================================================================
  Logger.log(`Processing file: ${file.getName()}`);
  const content = file.getBlob().getDataAsString();

  // Example: Parse a simple key-value pair from the file
  const [key, value] = content.split(':');
  if (key === 'user_id') {
    // Do something with the user ID
  }

  return `Successfully processed file with key: ${key}.`;
};
```

### 2. Adding New Configuration

If your custom logic requires new settings (e.g., an API endpoint), add them to the `AppConfig` interface and the `getConfig` function in `src/config.ts`.

```typescript
// src/config.ts

export interface AppConfig {
  // ... existing settings
  apiEndpoint: string;
}

export const getConfig = (): AppConfig => {
  // ...
  return {
    // ... existing settings
    apiEndpoint: 'https://api.example.com/v1/process',
  };
};
```

You can then access this setting from anywhere in your code by calling `getConfig().apiEndpoint`.

### 3. Adding a New Menu Item

To add a new UI control, edit `src/ui.ts`.

1.  Write a new function that you want to be called from the menu.
2.  Expose it to the global scope.
3.  Add it to the `createMenu` call in the `onOpen` function.

```typescript
// src/ui.ts

// 1. Write your function
const sendTestEmail = () => {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Test Email', 'This is a test.');
};

// 2. Expose it globally
global.sendTestEmail = sendTestEmail;

// 3. Add it to the menu in onOpen
global.onOpen = (): void => {
  SpreadsheetApp.getUi()
    .createMenu('File Processor')
    // ... existing items
    .addItem('Send Test Email', 'sendTestEmail') // Add your new item here
    .addToUi();
};
```

## Best Practices

### Secrets Management

**Never hardcode API keys or other secrets in your code.** Use the `PropertiesService` to store them securely.

-   **To store a secret:**
    ```typescript
    PropertiesService.getUserProperties().setProperty('API_KEY', 'your_secret_key');
    ```
-   **To retrieve a secret:**
    ```typescript
    const apiKey = PropertiesService.getUserProperties().getProperty('API_KEY');
    ```

Consider creating a `setup` function in the UI to prompt the user for their keys.

### Testing

This project uses Vitest for unit testing. When you add new functionality, especially to the processing engine, you should add a corresponding test.

-   Create test files with a `.test.ts` extension (e.g., `src/myFeature.test.ts`).
-   Use the `gas-mock-globals` library to mock Google Apps Script services.
-   Run tests with `pnpm test`.

### Error Handling

The `processNextItem` function in `src/processingEngine.ts` includes a `try...catch` block. This ensures that if one file fails to process, the entire script doesn't crash. The error is logged to the "Jobs Tracker" sheet, and the file is moved to the "Error" folder.

Ensure your custom logic within `processFile` throws an error if something goes wrong so the system can catch it and handle it gracefully.

### Managing Permissions

When you add code that uses a new Google service (e.g., `MailApp`, `CalendarApp`), `clasp` will automatically detect the required permissions and update the `appsscript.json` manifest file when you push your code.

However, it's good practice to be aware of the scopes your script is requesting. You can review them in the `oauthScopes` section of `appsscript.json`.
