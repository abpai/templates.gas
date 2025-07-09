# Google Apps Script (GAS) Project Template

This template provides a modern, robust starting point for developing Google Apps Script projects using TypeScript, Vite, and other modern development tools.

## Features

-   **TypeScript:** Write your GAS code with types for better maintainability and fewer runtime errors.
-   **Vite:** A fast and modern build tool, configured to bundle your TypeScript into a single `Code.js` file for GAS.
-   **`clasp`:** Google's official command-line tool for managing Apps Script projects.
-   **ESLint & Prettier:** For consistent code style and quality.
-   **Vitest:** A blazing-fast unit testing framework.
-   **Client-Server Communication:** Includes a sidebar example demonstrating how to call server-side TypeScript functions from your client-side UI.
-   **Automated Deployment:** A pre-configured GitHub Actions workflow to automatically deploy your script on pushes to the `main` branch.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or higher)
-   [pnpm](https://pnpm.io/installation)
-   [clasp](https://github.com/google/clasp#installation)

### Installation

1.  **Use this template:** Click the "Use this template" button on GitHub to create a new repository.
2.  **Clone your repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    cd YOUR_REPO_NAME
    ```
3.  **Install dependencies:**
    ```bash
    pnpm install
    ```

### Configuration

1.  **Log in to `clasp`:**
    ```bash
    clasp login
    ```
2.  **Create a new Apps Script project:**
    You can create a new project directly from the command line.
    ```bash
    # Create a new project linked to your Google Sheets
    clasp create --type sheets --title "My New Project"

    # Or for a standalone script
    clasp create --type standalone --title "My New Project"
    ```
    This will create a `.clasp.json` file with your `scriptId`.

    **Note:** Before using `clasp` to create or manage projects, you must enable the "Google Apps Script API" in your account settings.
    Go to [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings) and turn on "Google Apps Script API allows third-party applications you authorize to use the Apps Script API to modify your Apps Script projects and deployments."

3.  **Configure folder names (optional):**
    The application automatically creates different folder names for test and production environments:
    - **Test environment:** `Document AI [TEST_ENV]`
    - **Production environment:** `Document AI`

    You can customize these names by modifying the `__ROOT_PATH__` constant in:
    - `vitest.config.ts` (for test environment)
    - `vite.config.ts` (for production environment)

    **Important:** If you change the folder names, make sure to update your Google Drive folder structure accordingly.

4.  **Set up Google Drive folder structure:**
    The application will automatically create the following folder structure in your Google Drive:
    ```
    📁 Document AI (or your configured root folder name)
    ├── 📁 1. Input      (files to be processed)
    ├── 📁 2. Processed  (successfully processed files)
    └── 📁 3. Error      (files that failed to process)
    ```
    You can trigger the setup by running the "Setup Folders" function from the Google Sheets menu.

## Development Workflow

### Building the Code

-   **Build for production:**
    ```bash
    pnpm build
    ```
-   **Build for development (with file watching):**
    ```bash
    pnpm dev
    ```

### Pushing to Google Apps Script

-   **Push the latest build:**
    ```bash
    pnpm push
    ```
-   **Watch for changes and push automatically:**
    In a separate terminal from `pnpm dev`, run:
    ```bash
    pnpm push:watch
    ```

### Testing

-   **Run all tests:**
    ```bash
    pnpm test
    ```

## Automated Deployment (CI/CD)

This template includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys your script to Google Apps Script when you push to the `main` branch.

### Setup

1.  **Get your `clasp` credentials:**
    Run the following command to find the location of your `.clasprc.json` file:
    ```bash
    clasp login --status
    ```
    Open the file and copy its entire contents.

2.  **Create a GitHub Secret:**
    -   In your GitHub repository, go to `Settings` > `Secrets and variables` > `Actions`.
    -   Click `New repository secret`.
    -   Name the secret `CLASPRC_JSON`.
    -   Paste the contents of your `.clasprc.json` file into the value field.
    -   Save the secret.

Now, every time you push to `main`, the action will run, authenticate with `clasp`, and deploy your latest build.

## Project Structure

-   `src/`: Contains all your TypeScript source code.
    -   `main.ts`: The main logic of your application.
    -   `ui.ts`: Code for creating custom menus and UI elements.
    -   `html/`: Contains your client-side HTML files.
-   `.github/`: Contains GitHub Actions workflows.
-   `dist/`: The output directory for the bundled `Code.js` file.
-   `vite.config.ts`: Configuration for the Vite build tool.
-   `appsscript.json`: The manifest file for your Google Apps Script project.
