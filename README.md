EduTrack – Smart Attendance & Parent Alert System

EduTrack is a smart web-based attendance management and parent alert system designed to simplify student attendance tracking and improve communication between educational institutions and parents. The system enables faculty and administrators to efficiently manage attendance, monitor student performance, and automatically notify parents about important attendance updates.

Key Features
Smart Attendance Management – Record and manage student attendance digitally.
Real-Time Monitoring – Track attendance status and student records efficiently.
Parent Alerts – Send attendance-related notifications directly to parents through SMS or other communication channels.
Student Dashboard – Allow students to view their attendance records and status.
Admin Dashboard – Manage students, departments, attendance, and reports from a centralized dashboard.
Attendance Reports – Generate and filter attendance reports based on students, departments, dates, and attendance status.
Low Attendance Alerts – Automatically identify students with low attendance and notify parents.
Secure & Centralized Data – Maintain student and attendance information in one organized system.

EduTrack aims to make attendance management smarter, reduce manual work, and ensure that parents stay informed about their child's attendance in a timely manner.

├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── supabase_schema.sql
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── lib/
    │   ├── types.ts
    │   ├── college.ts
    │   ├── utils.ts
    │   ├── supabase.ts
    │   ├── mockData.ts
    │   └── pdfExport.ts
    ├── context/
    │   ├── AuthContext.tsx
    │   └── ThemeContext.tsx
    ├── components/
    │   ├── AppShell.tsx
    │   ├── CrudPage.tsx
    │   └── ui/
    │       ├── button.tsx
    │       ├── input.tsx
    │       ├── select.tsx
    │       ├── table.tsx
    │       ├── card.tsx
    │       ├── badge.tsx
    │       ├── tabs.tsx
    │       ├── dialog.tsx
    │       ├── alert-dialog.tsx
    │       └── skeleton.tsx
    └── pages/
        ├── LandingAuth.tsx
        ├── Dashboard.tsx
        ├── Attendance.tsx
        ├── Departments.tsx
        ├── Teachers.tsx
        ├── Subjects.tsx
        ├── Students.tsx
        ├── Reports.tsx
        └── SmsLogs.tsx
# EduTrack

## 🚀 Getting Started

Follow these steps to get a local copy of **EduTrack** and start working on it.

### 1. Fork the repository

Open the EduTrack GitHub repository and click the **Fork** button in the top-right corner.

This creates your own copy of the repository under your GitHub account.

### 2. Clone the repository

Open your terminal or PowerShell and run:

```powershell
git clone https://github.com/Pratiksha251001/EduTrack.git
```

### 3. Open the project folder

Move into the cloned project:

```powershell
cd EduTrack
```

Or, if you want to open it directly in VS Code:

```powershell
code .
```

### 4. Install dependencies

Install all required packages:

```powershell
npm install
```

### 5. Start the development server

Run:

```powershell
npm run dev
```

The application should be available at:

```text
http://localhost:5173
```

### 6. Edit the project

Open the **EduTrack** folder in VS Code and make your changes.

The main source code is located inside:

```text
src/
```

After making changes, save the files and check the application in your browser.

### 7. Check your changes

Run:

```powershell
git status
```

Review the files you changed.

### 8. Commit your changes

```powershell
git add .
git commit -m "Update EduTrack features"
```

### 9. Push your changes

```powershell
git push
```

Your changes will be uploaded to your GitHub repository.

---

## 📁 Project Structure

```text
EduTrack/
├── src/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── pages/
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── package-lock.json
├── supabase_schema.sql
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

## 🛠️ Tech Stack

* React
* TypeScript
* Vite
* Tailwind CSS
* Supabase
* JavaScript / TypeScript
* PDF Generation

## 📌 Important

Do not commit sensitive environment variables or API keys.

Make sure files such as `.env` are included in `.gitignore`.

## 👥 Contributing

If you want to contribute:

1. Fork the repository.
2. Clone your fork.
3. Create a new branch.
4. Make your changes.
5. Commit your changes.
6. Push the branch to GitHub.
7. Create a Pull Request.

Example:

```powershell
git checkout -b feature/your-feature
git add .
git commit -m "Add new feature"
git push -u origin feature/your-feature
```



Optional: If you prefer to run with the built‑in mock data (no Supabase backend), the app works out‑of‑the‑box. To connect to a Supabase instance, update the connection details in src/lib/supabase.ts.


        
