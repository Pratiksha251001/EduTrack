export const college = {
  name: "EduTrack Institute of Technology",
  shortName: "EduTrack",
  tagline: "Manage Attendance. Alert Parents. Build Trust.",
  logoUrl: "/logo.png",
  minAttendance: 75,
  semesters: [1, 2, 3, 4, 5, 6, 7, 8],
};

export function generateSmsMessage(studentName: string, date: string, subjectName: string): string {
  return `Dear Parent,\n\nYour child, ${studentName}, was absent today (${date}) for the subject "${subjectName}" at ${college.name}.\n\nPlease contact your child if required.\n\nThank you.`;
}
