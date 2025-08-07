# Jekyll Buildr v.2.1

Welcome to Jekyll Buildr, a modern, web-based editor designed to streamline your Jekyll workflow. Built with a powerful tech stack, this application provides an intuitive interface to create, edit, and manage your Jekyll projects, complete with AI-powered features and direct integration with GitHub.

## ✨ Key Features

*   **💻 In-Browser Code Editor**: A full-featured code editor with syntax highlighting for various file types (`.html`, `.md`, `.yml`, `.css`, etc.), right in your browser.
*   **🗂️ File Management**: A familiar file explorer to navigate, create, rename, and delete files and folders within your Jekyll project structure.
*   **🤖 AI Component Generation**: Describe a component you need—like a navigation bar or a post layout—and let the AI generate the Jekyll-compliant HTML and Liquid code for you.
*   **🎨 AI Image Generation**: Generate unique images for your posts and assets by simply providing a text prompt.
*   **🚀 Direct GitHub Integration**:
    *   **Push to Branch**: Commit and push all your changes directly to your selected GitHub repository branch.
    *   **Create Pull Requests**: Create a new branch, commit your changes, and open a pull request for a safer, review-based workflow.
*   **🔐 Secure Authentication**: User authentication is handled securely via GitHub OAuth through Firebase Authentication.
*   **👑 Pro Tier Subscriptions**: Unlock advanced features by upgrading to a Pro account, managed via PayPal subscriptions.

## 🛠️ Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
*   **Authentication & Database**: [Firebase](https://firebase.google.com/) (Auth, Firestore)
*   **AI Features**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
*   **Payments**: [PayPal](https://www.paypal.com/)

## 🚀 Getting Started

1.  **Login**: Sign in to the application using your GitHub account.
2.  **Connect GitHub**: Navigate to the **Settings** page.
3.  **Install App**: Click "Connect with GitHub" to install the Jekyll Buildr GitHub App on your desired repositories.
4.  **Select Repo & Branch**: Once connected, select the repository and the primary branch you want to work on.
5.  **Edit & Create**: Return to the main editor page. You can now edit existing files or create new files and folders.
6.  **Use AI**:
    *   Click the **✨ (Sparkles)** icon in the editor header to generate a Jekyll component from a text prompt.
    *   In the `assets/images` folder, use the **✨ (Sparkles)** icon to generate an image from a text prompt.
7.  **Publish**:
    *   Use the **Push to GitHub** button to commit your changes directly to the selected branch.
    *   Use the **Create Pull Request** button for a safer workflow, which will create a new branch and a PR for you to review and merge on GitHub.
