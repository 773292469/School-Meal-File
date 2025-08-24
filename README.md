# School Meal Programme Inspection System

This is a web-based inspection system for managing and reporting on school meal programmes.  
It has a clean interface and optional Google Drive integration for saving and syncing inspection data.

---

## 📂 Project Structure
```
.
├── index.html          # Main entry file
├── css/
│   └── style.css       # Stylesheet
├── js/
│   └── script.js       # JavaScript logic
└── assets/             # Placeholder for images/files
```

---

## 🚀 How to Deploy on GitHub Pages

1. **Download & Unzip**
   - Download this project and unzip it on your computer.

2. **Create a GitHub Repository**
   - Go to [GitHub](https://github.com/) and create a new repository (e.g., `school-meal-inspection`).

3. **Upload Files**
   - Upload all the project files (`index.html`, `css/`, `js/`, `assets/`) into your repository.

4. **Enable GitHub Pages**
   - Go to **Repository → Settings → Pages**  
   - Under **Source**, select: `Deploy from a branch`  
   - Select `main` branch and root (`/`) folder  
   - Save changes

5. **Access Your Site**
   - After 1–2 minutes, your site will be live at:  
     `https://<your-username>.github.io/school-meal-inspection/`

---

## 🔑 Google Drive Integration Setup

If you want to enable Google Drive syncing:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).  
2. Enable the **Google Drive API**.  
3. Configure **OAuth Consent Screen**.  
4. Create **OAuth Client ID** (Web Application).  
   - Add your GitHub Pages domain (e.g., `https://<your-username>.github.io`) as an **Authorized JavaScript Origin**.  
5. Replace placeholders in `js/script.js`:  
   ```js
   const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
   const API_KEY = 'YOUR_GOOGLE_API_KEY';
   ```

---

## 📝 Notes
- This project is prepared for **GitHub Pages**, but you can also deploy it on **Netlify**, **Vercel**, or **Firebase Hosting**.  
- Use the `/assets` folder for storing images (e.g., school meal photos).  
- All styles and scripts have been separated for better maintainability.

---

👨‍💻 Developed for **Wilgamuwa Education Zone - Ministry of Education**
