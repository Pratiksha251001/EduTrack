# EduTrack – Smart Attendance & Parent Alert System

EduTrack is an enterprise-ready, role-based attendance management and parent alert web application designed for engineering colleges and universities. It streamlines student attendance tracking, class and subject allocations, syllabus importing, defaulter monitoring (<75%), and automated multi-lingual parent notifications.

---

## 🌟 Key Highlights & Capabilities

- **Zero-Config Instant Run**: Works out-of-the-box with built-in reactive local storage and sample data. No mandatory cloud database setup required to run or evaluate!
- **Optional Supabase Cloud Sync**: Easily connect a real Supabase backend by providing your credentials and running `supabase_schema.sql`.
- **Class, Subject & Syllabus Import**:
  - Direct PDF / Scheme syllabus parser using `pdfjs-dist` to automatically extract subject codes, names, lecture hours, and credits.
  - Multi-division class mappings and faculty assignment across sections (e.g. CSE-A, CSE-B).
  - Bulk student and faculty roster imports via Excel / CSV (`.xlsx`, `.csv`).
- **Role-Based Access Control (RBAC)**:
  - **Admin / Principal**: Comprehensive college overview, department management, faculty rosters, audit logs, and college-wide analytics.
  - **Head of Department (HOD)**: Departmental classes, syllabus schemes, faculty allocations, and student performance oversight.
  - **Class Coordinator / Class Teacher**: Class attendance consolidation, defaulter alerts, timetable tracking, and parent communications.
  - **Subject Faculty / Teacher**: Daily lecture attendance recording, instant verification, and class-wise status.
  - **Student & Parent Portal**: Real-time subject-wise percentage, attendance history, low attendance warnings, and college notices.
- **Automated Parent Alerts & SMS Dispatch**: Real-time SMS dispatch simulator and live Twilio / gateway integration with multi-lingual templates (English, Hindi, Marathi, etc.).
- **Official Reports & Export**: Export detailed attendance registers and monthly reports to PDF (formatted tables via `jspdf-autotable`) and Excel (`xlsx`).

---

## 🚀 How to Run the Project Locally

Anyone can clone and run this project locally in less than 2 minutes.

### 1. Prerequisites
Ensure you have installed on your machine:
- **Node.js**: Version 18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm** (comes with Node.js) or **pnpm** / **bun** / **yarn**
- **Git** ([Download Git](https://git-scm.com/))

### 2. Clone the Repository
```bash
git clone https://github.com/Pratiksha251001/EduTrack.git
cd EduTrack
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables (Optional)
The application is pre-configured to run with high-fidelity local data out of the box. 

If you want to connect your own Supabase project or SMS gateway, copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your details:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SMS_API_URL=
VITE_SMS_API_KEY=
```

*(If these variables are omitted or blank, EduTrack automatically uses its built-in local database with full state persistence).*

### 5. Start the Development Server
```bash
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:3000
```
*(If running Vite directly via `npx vite`, the default port is `http://localhost:5173`)*.

---

## 🔑 Demo Access & Login Credentials

When launching the application, you can quickly test different roles using the interactive role selector on the login screen, or sign in using these default credentials:

| Role | Email | Default Password | Access Level |
|---|---|---|---|
| **Admin / Principal** | `admin@smit.edu` | `Admin@123` | Full administrative control, departments, teachers |
| **HOD (Computer Engg)** | `hod.cse@smit.edu` | `Hod@123` | Department classes, faculty subject allocation |
| **Class Coordinator** | `teacher1@smit.edu` | `Teacher@123` | Division tracking (CSE-A), batch defaulter alerts |
| **Subject Faculty** | `teacher2@smit.edu` | `Teacher@123` | Lecture attendance marking, session records |
| **Student** | `student1@smit.edu` | `Student@123` | Attendance stats, subject ledger, notice board |

---

## 📚 Class & Syllabus PDF Import Guide

To import university syllabus schemes and subjects automatically:

1. Log in as **Admin** or **HOD**.
2. Navigate to **Subjects** from the navigation menu.
3. Click the **"Import Syllabus (PDF / Scheme)"** button at the top right.
4. Upload your University Curriculum or Scheme PDF file (e.g. *Savitribai Phule Pune University (SPPU)*, *Mumbai University*, *VTU*, or any standard academic syllabus).
5. The built-in PDF parser extracts:
   - Subject Code (e.g., `310241`, `CS601`)
   - Subject Title & Course Name
   - Lecture, Tutorial, Practical (L-T-P) hours & Credits
6. Review the extracted subjects, select the target academic year / semester and department, and click **"Save & Allocate to Classes"**.
7. Faculty members can now be assigned to specific divisions (e.g. *CSE-A*, *CSE-B*) for those imported subjects.

---

## 🔄 How to Push & Sync Changes to GitHub

If you are developing inside **Google AI Studio** or a container environment, changes made in the web editor must be pushed to your GitHub repository using one of the following methods:

### Method A: Use AI Studio GitHub Export (Easiest)
1. In the upper right-hand corner of Google AI Studio, open the **Project Menu** (three dots or Settings gear).
2. Click **Export to GitHub**.
3. Select your repository `Pratiksha251001/EduTrack` and confirm the export branch (e.g. `main`).

### Method B: Download ZIP & Push from Your Terminal
1. From the top-right menu, select **Download as ZIP**.
2. Extract the ZIP file on your computer.
3. Open a terminal inside the extracted directory and run:
   ```bash
   git init
   git remote add origin https://github.com/Pratiksha251001/EduTrack.git
   git branch -M main
   git add .
   git commit -m "feat: Add class subject import and attendance enhancements"
   git push -u origin main --force
   ```

### Method C: Standard Git Workflow (If working locally)
```bash
git status
git add .
git commit -m "Update class and subject import features"
git push origin main
```

---

## 📁 Project Structure

```text
EduTrack/
├── dist/                     # Compiled production build output
├── public/                   # Static assets, logos & favicon
├── src/
│   ├── components/           # Reusable UI & modal dialogs
│   │   ├── SyllabusImportModal.tsx    # PDF curriculum & syllabus parser modal
│   │   ├── StudentImportModal.tsx     # Student Excel/CSV bulk import
│   │   ├── TeacherImportModal.tsx     # Faculty bulk import
│   │   ├── AttendanceVerificationModal.tsx # Attendance review before submission
│   │   ├── ParentAlertModal.tsx       # SMS alert dispatch & preview
│   │   ├── ReportDownloadModal.tsx    # PDF & Excel register exporter
│   │   ├── AppShell.tsx               # Responsive layout, sidebar & header
│   │   └── ui/                        # Button, Input, Table, Card, Select, Badges
│   ├── context/              # React Context providers (AuthContext, ThemeContext)
│   ├── lib/                  # Business logic, utilities & data layers
│   │   ├── mockData.ts       # Preloaded institutional mock data & initial state
│   │   ├── supabase.ts       # Supabase client with seamless local fallback
│   │   ├── syllabusParser.ts # PDF / text extractor for university schemes
│   │   ├── pdfExport.ts      # PDF report generator using jsPDF
│   │   ├── college.ts        # Institutional constants & semester schemes
│   │   └── types.ts          # Shared TypeScript models and interfaces
│   ├── pages/                # Application views and dashboard routes
│   │   ├── LandingAuth.tsx   # Sign-in portal with quick demo switcher
│   │   ├── Dashboard.tsx     # Admin / Principal metrics dashboard
│   │   ├── Attendance.tsx    # Lecture attendance marking & fast toggle
│   │   ├── Subjects.tsx      # Subject directory, faculty allocation & syllabus import
│   │   ├── Students.tsx      # Student directory, enrollments & attendance ledger
│   │   ├── Teachers.tsx      # Faculty directory and department mapping
│   │   ├── Reports.tsx       # Defaulter list (<75%) and analytical charts
│   │   ├── SmsLogs.tsx       # Dispatched parent alert logs & delivery states
│   │   ├── HODDashboard.tsx  # Department head academic command center
│   │   ├── ClassCoordinatorDashboard.tsx # Class teacher batch supervision
│   │   └── StudentDashboard.tsx # Student self-service attendance portal
│   ├── App.tsx               # Routing, theme wrapper & route guards
│   └── main.tsx              # Application React 18 DOM mount point
├── server.ts                 # Express full-stack server with Vite middleware
├── supabase_schema.sql       # PostgreSQL / Supabase table definitions and policies
├── tailwind.config.js        # Styling system and responsive typography
├── package.json              # NPM dependencies and build scripts
└── README.md                 # Project documentation
```

---

## 🛠️ Tech Stack

- **Frontend Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/) + [tsx](https://github.com/privatenumber/tsx)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Dark / Light theme support
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts & Visualizations**: [Recharts](https://recharts.org/)
- **PDF & Document Processing**:
  - [pdfjs-dist](https://mozilla.github.io/pdf.js/) for syllabus & scheme parsing
  - [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) for reports
  - [xlsx](https://sheetjs.com/) for spreadsheet import/export
- **Backend / Database Options**:
  - Local Storage Reactive DB (built-in, default)
  - [Supabase](https://supabase.com/) (PostgreSQL database with Row Level Security)
  - [Express](https://expressjs.com/) application server (`server.ts`)

---

## 📋 Available Scripts

In the project directory, you can run:

| Command | Purpose |
|---|---|
| `npm run dev` | Starts the Express server and Vite development server on port `3000` |
| `npm run build` | Compiles the frontend and packages the server bundle into `dist/` |
| `npm run start` | Runs the compiled production server |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run preview` | Previews the production Vite build locally |

---

## 📄 License & Academic Note

EduTrack is designed for academic institutions to streamline attendance tracking, prevent student absenteeism, and bridge communication between colleges and parents. Designed and developed with care.
