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

## Next steps

### 1. Install dependencies

```powershell
cd H:\APA
npm install
```

### 2. Start the development server

```powershell
npm run dev
```

The app should be reachable at:

`http://localhost:5173`


Optional: If you prefer to run with the built‑in mock data (no Supabase backend), the app works out‑of‑the‑box. To connect to a Supabase instance, update the connection details in src/lib/supabase.ts.


        
