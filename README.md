# Customer Support Query Categorizer 🚀

A web-based tool that analyzes customer queries using **Gemini 2.5 Flash** and automatically categorizes them into topics (Billing, Technical Support, General Inquiry, Account, Feedback). 

Uses **Google Sheets** as a database and **Google Apps Script** as the backend API.

---

## Live Demo Architecture
- Frontend: HTML/CSS/Vanilla JS (Hosted on GitHub Pages)
- Backend: Google Apps Script Web App
- DB: Google Sheets
- AI Model: `gemini-2.5-flash`

---

## 🛠 Setup Instructions

Follow these steps exactly to deploy your own instance of this application.

### Step 1: Create Google Sheet (Database)
1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Rename the document to `CustomerSupportDB` (or any name).
3. **Sheet 1**: Rename the default tab to exactly `Users` (case-sensitive).
   - In Row 1, add columns: `username | role | created_at`
   - In Row 2, add the admin account: `admin | admin | (leave blank)`
4. **Sheet 2**: Click the `+` to add a new tab and name it exactly `Queries` (case-sensitive).
   - In Row 1, add columns: `id | username | query | category | confidence | status | timestamp`

### Step 2: Create Apps Script Backend
1. In your Google Sheet, click on **Extensions → Apps Script**.
2. Delete any existing code in the editor (`Code.gs`).
3. Open the `appscript.js` file from this project folder.
4. Copy the entire contents of `appscript.js` and paste it into the Apps Script editor.
5. Save the file (Ctrl+S or Cmd+S).

### Step 3: Secure Your Gemini API Key
Wait! Do NOT put your API key in the source code. You will store it securely in Google's server environments.
1. In the Apps Script editor, click the **⚙️ Project Settings** (gear icon) on the left sidebar.
2. Scroll down to the **Script Properties** section.
3. Click **Add script property**.
4. Set **Property**: `GEMINI_API_KEY`
5. Set **Value**: *Your Gemini API Key (e.g. AIzaSy...)*
6. Click **Save script properties**.

### Step 4: Deploy Apps Script
1. In the top right of the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Description**: `Customer Support API`
4. Set **Execute as**: `Me`
5. Set **Who has access**: `Anyone`
6. Click **Deploy**.
7. **Authorize Access** when prompted (Click "Review permissions", select your account, click "Advanced", and click "Go to project").
8. **Copy the Web App URL** shown on the final screen. It looks like: `https://script.google.com/macros/s/.../exec`.

### Step 5: Update Frontend Configuration
1. Back on your computer, open `js/config.js` in a text editor.
2. Replace the `API_BASE_URL` constant with the Web App URL you just copied in Step 4.
3. Save the file.

### Step 6: Deploy to GitHub
1. Create a new public repository on GitHub.
2. Push all the files in this folder to your repo.
3. Go to your repo's **Settings → Pages**.
4. Set Source to **Deploy from a branch**, select the `main` branch, and set the folder to `/ (root)`.
5. Click **Save**.
6. Wait 1-2 minutes. Your frontend is now successfully deployed and live!

---

## 🔑 Login Credentials

- **Admin Account:** Username `admin`, Password `admin` (Use the Admin Tab on the login page)
- **User Account:** Use the User Tab. Enter *any* username and *any* password you want; the backend will automatically register you in the `Users` sheet.

## ✨ Features
1. **Dynamic Category Routing**: Uses Gemini 2.5 Flash to accurately assign categories and calculate a confidence score for each query.
2. **Beautiful Progress UI**: Smooth simulated progress bars with CSS checkbox/failure animations when hitting the backend.
3. **Floating Support Chatbot**: Instant AI help directly via a chat widget on the bottom left.
4. **CSS-only Analytics**: Pure CSS charts to visualize incoming tickets for the admin without external heavy libraries like Chart.js.
5. **No Cors Hassle**: Simple `fetch` wrappers handle Google Apps Script 302 redirects seamlessly.
