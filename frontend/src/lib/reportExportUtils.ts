import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { college } from "./college";

export interface AttendanceReportRow {
  roll: string;
  reg: string;
  name: string;
  className?: string;
  subject: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
  parentName?: string;
  parentMobile?: string;
}

export interface AttendanceExportOptions {
  rows: AttendanceReportRow[];
  periodLabel: string;
  scopeLabel: string;
  reportTitle?: string;
  isDefaulterReport?: boolean;
  yearLabel?: string;
  classLabel?: string;
  semesterLabel?: string;
  departmentLabel?: string;
  subjectLabel?: string;
  roleLabel?: string;
  fileName?: string;
}

/**
 * Export Official Academic Attendance Report to PDF
 */
export function exportAttendancePdf({
  rows,
  periodLabel,
  scopeLabel,
  reportTitle,
  isDefaulterReport = false,
  yearLabel,
  classLabel,
  semesterLabel,
  departmentLabel,
  subjectLabel,
  roleLabel,
  fileName,
}: AttendanceExportOptions): void {
  const doc = new jsPDF("p", "mm", "a4");
  const minAttendance = college.minAttendance || 75;

  // Header Banner Color: Crimson/Burgundy for Defaulter report, Deep Forest Green for standard
  const headerColor: [number, number, number] = isDefaulterReport
    ? [153, 27, 27] // Red-800
    : [34, 76, 56]; // Forest Green

  doc.setFillColor(...headerColor);
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(college.name, 14, 11);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const subTitle = isDefaulterReport
    ? `${college.tagline} · OFFICIAL ACADEMIC DEFAULTER AUDIT REPORT (< ${minAttendance}% ATTENDANCE)`
    : `${college.tagline} · Official Academic Attendance Register & Audit Report`;
  doc.text(subTitle, 14, 18);

  doc.setFontSize(7.5);
  doc.text("Approved by AICTE & Affiliated to University · Statutory Academic Record", 14, 24);

  // Metadata Box Header
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(
    reportTitle ||
      (isDefaulterReport ? "Academic Defaulter Compliance Sheet" : "Academic & Scope Information"),
    14,
    35
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  // Left Column Metadata
  let currentY = 41;
  if (departmentLabel && departmentLabel !== "__all") {
    doc.text(`Department: ${departmentLabel}`, 14, currentY);
    currentY += 5;
  }
  if (yearLabel && yearLabel !== "__all") {
    doc.text(`Engineering Year: ${yearLabel}`, 14, currentY);
    currentY += 5;
  }
  if (classLabel && classLabel !== "__all") {
    doc.text(`Class / Division: ${classLabel}`, 14, currentY);
    currentY += 5;
  }
  if (semesterLabel) {
    doc.text(`Semester: ${semesterLabel}`, 14, currentY);
    currentY += 5;
  }
  if (subjectLabel && subjectLabel !== "__all") {
    doc.text(`Subject: ${subjectLabel}`, 14, currentY);
    currentY += 5;
  }

  // Right Column Metadata
  let rightY = 41;
  doc.text(`Date Interval: ${periodLabel}`, 115, rightY);
  rightY += 5;
  doc.text(`Generated On: ${new Date().toLocaleString()}`, 115, rightY);
  rightY += 5;
  if (roleLabel) {
    doc.text(`Access Scope: ${roleLabel}`, 115, rightY);
    rightY += 5;
  }
  doc.text(`Min Required Attendance: ${minAttendance}%`, 115, rightY);
  rightY += 5;
  doc.text(
    isDefaulterReport
      ? `Defaulter Count: ${rows.length} Student(s)`
      : `Total Records in Report: ${rows.length}`,
    115,
    rightY
  );

  let startTableY = Math.max(currentY, rightY) + 3;

  // Defaulter warning banner if applicable
  if (isDefaulterReport) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(14, startTableY, 182, 10, 1.5, 1.5, "FD");

    doc.setTextColor(185, 28, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(
      `STATUTORY NOTICE: Students with attendance < ${minAttendance}% require mandatory parent notification and are at risk of exam detention.`,
      17,
      startTableY + 6.5
    );
    startTableY += 13;
  }

  // Table Columns
  const headers = isDefaulterReport
    ? [
        "Roll No",
        "Reg No",
        "Student Name",
        "Class",
        "Subject",
        "Total",
        "Attended",
        "Shortfall",
        "Att %",
        "Parent Mobile",
      ]
    : [
        "Roll No",
        "Reg No",
        "Student Name",
        "Class",
        "Subject",
        "Total",
        "Present",
        "Absent",
        "Att %",
      ];

  const tableRows = rows.map((r) => {
    if (isDefaulterReport) {
      const shortfallClasses = Math.max(
        0,
        Math.ceil((minAttendance / 100) * r.total) - r.present
      );
      return [
        r.roll,
        r.reg || "—",
        r.name,
        r.className || "—",
        r.subject,
        r.total.toString(),
        r.present.toString(),
        shortfallClasses > 0 ? `-${shortfallClasses}` : "0",
        `${r.percentage}%`,
        r.parentMobile || "—",
      ];
    }
    return [
      r.roll,
      r.reg || "—",
      r.name,
      r.className || "—",
      r.subject,
      r.total.toString(),
      r.present.toString(),
      r.absent.toString(),
      `${r.percentage}%`,
    ];
  });

  const percentageColIndex = isDefaulterReport ? 8 : 8;

  autoTable(doc, {
    startY: startTableY,
    head: [headers],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: headerColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: {
      fillColor: isDefaulterReport ? [255, 245, 245] : [248, 250, 248],
    },
    columnStyles: isDefaulterReport
      ? {
          0: { cellWidth: 16 },
          1: { cellWidth: 18 },
          2: { cellWidth: 32 },
          3: { cellWidth: 18 },
          4: { cellWidth: 32 },
          5: { halign: "right", cellWidth: 10 },
          6: { halign: "right", cellWidth: 12 },
          7: { halign: "right", fontStyle: "bold", textColor: [220, 38, 38], cellWidth: 14 },
          8: { halign: "right", fontStyle: "bold", cellWidth: 14 },
          9: { cellWidth: 22 },
        }
      : {
          0: { cellWidth: 18 },
          1: { cellWidth: 20 },
          2: { cellWidth: 36 },
          3: { cellWidth: 18 },
          4: { cellWidth: 36 },
          5: { halign: "right", cellWidth: 12 },
          6: { halign: "right", cellWidth: 14 },
          7: { halign: "right", cellWidth: 14 },
          8: { halign: "right", fontStyle: "bold", cellWidth: 16 },
        },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === percentageColIndex) {
        const val = parseFloat(data.cell.raw as string);
        if (val < minAttendance) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [22, 101, 52];
        }
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 12;

  // Multi-page signature placement: if near page bottom, append a fresh page
  if (finalY > 240) {
    doc.addPage();
    finalY = 20;
  }

  // 4 Official Signatures Sign-Off Block
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  const sigWidth = 40;
  const sigPositions = [14, 62, 110, 158];

  // Signature lines
  sigPositions.forEach((x) => {
    doc.setDrawColor(160, 160, 160);
    doc.line(x, finalY + 14, x + sigWidth, finalY + 14);
  });

  doc.text("Subject Teacher", sigPositions[0], finalY + 19);
  doc.text("Class Coordinator (CC)", sigPositions[1], finalY + 19);
  doc.text("Head of Dept (HOD)", sigPositions[2], finalY + 19);
  doc.text("Principal / Dean", sigPositions[3], finalY + 19);

  const defaultFileName = isDefaulterReport
    ? `Defaulter-Report-${(yearLabel || "All").replace(/\s+/g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`
    : `Attendance-Report-${(yearLabel || "All").replace(/\s+/g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`;

  doc.save(fileName || defaultFileName);
}

/**
 * Export Official Academic Attendance Report to Excel (.xlsx)
 */
export function exportAttendanceExcel({
  rows,
  periodLabel,
  scopeLabel,
  reportTitle,
  isDefaulterReport = false,
  yearLabel,
  classLabel,
  departmentLabel,
  subjectLabel,
  roleLabel,
  fileName,
}: AttendanceExportOptions): void {
  const minAttendance = college.minAttendance || 75;

  const headerRows: any[][] = [
    [college.name.toUpperCase()],
    [`OFFICIAL ACADEMIC ATTENDANCE AUDIT SHEET${isDefaulterReport ? " (DEFAULTER LIST < 75%)" : ""}`],
    [`Scope: ${scopeLabel || "All"} | Department: ${departmentLabel || "All"} | Year: ${yearLabel || "All"} | Class: ${classLabel || "All"}`],
    [`Subject: ${subjectLabel || "All"} | Date Interval: ${periodLabel} | Generated By: ${roleLabel || "User"}`],
    [`Generated On: ${new Date().toLocaleString()} | Minimum Required Attendance: ${minAttendance}% | Total Count: ${rows.length}`],
    [], // Blank separator
  ];

  const columnHeaders = [
    "Roll No",
    "PRN / Reg No",
    "Student Name",
    "Class / Division",
    "Subject",
    "Total Sessions",
    "Attended (Present)",
    "Absent",
    "Attendance %",
    "Academic Status",
    "Shortfall Sessions",
    "Parent Name",
    "Parent Mobile",
  ];

  const dataRows = rows.map((r) => {
    const isDefaulter = r.percentage < minAttendance;
    const shortfall = isDefaulter
      ? Math.max(0, Math.ceil((minAttendance / 100) * r.total) - r.present)
      : 0;

    return [
      r.roll,
      r.reg || "—",
      r.name,
      r.className || "—",
      r.subject,
      r.total,
      r.present,
      r.absent,
      `${r.percentage}%`,
      isDefaulter ? `DEFAULTER (<${minAttendance}%)` : "ELIGIBLE",
      shortfall > 0 ? shortfall : 0,
      r.parentName || "—",
      r.parentMobile || "—",
    ];
  });

  const fullSheetData = [...headerRows, columnHeaders, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);

  // Column width calculations
  worksheet["!cols"] = [
    { wch: 14 }, // Roll
    { wch: 16 }, // Reg
    { wch: 28 }, // Name
    { wch: 16 }, // Class
    { wch: 34 }, // Subject
    { wch: 14 }, // Total
    { wch: 16 }, // Present
    { wch: 12 }, // Absent
    { wch: 14 }, // Percentage
    { wch: 22 }, // Status
    { wch: 18 }, // Shortfall
    { wch: 22 }, // Parent Name
    { wch: 16 }, // Parent Mobile
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    isDefaulterReport ? "Defaulter List" : "Attendance Register"
  );

  const defaultFileName = isDefaulterReport
    ? `Defaulter_Report_${(yearLabel || "All").replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`
    : `Attendance_Report_${(yearLabel || "All").replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;

  XLSX.writeFile(workbook, fileName || defaultFileName);
}

/**
 * Export Official Academic Attendance Report to CSV (.csv)
 */
export function exportAttendanceCsv({
  rows,
  isDefaulterReport = false,
  yearLabel,
  startDate,
  endDate,
  fileName,
}: {
  rows: AttendanceReportRow[];
  isDefaulterReport?: boolean;
  yearLabel?: string;
  startDate: string;
  endDate: string;
  fileName?: string;
}): void {
  const minAttendance = college.minAttendance || 75;

  const headers = [
    "Roll No",
    "Reg No",
    "Student Name",
    "Class",
    "Subject",
    "Total Classes",
    "Present",
    "Absent",
    "Attendance %",
    "Status",
    "Parent Name",
    "Parent Mobile",
  ];

  const csvRows = rows.map((r) => {
    const isDefaulter = r.percentage < minAttendance;
    return [
      `"${r.roll}"`,
      `"${r.reg || "—"}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${(r.className || "—").replace(/"/g, '""')}"`,
      `"${r.subject.replace(/"/g, '""')}"`,
      r.total,
      r.present,
      r.absent,
      `"${r.percentage}%"`,
      `"${isDefaulter ? "DEFAULTER" : "ELIGIBLE"}"`,
      `"${(r.parentName || "—").replace(/"/g, '""')}"`,
      `"${r.parentMobile || "—"}"`,
    ].join(",");
  });

  const csvContent = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    fileName ||
    `${isDefaulterReport ? "Defaulter" : "Attendance"}-${(yearLabel || "All").replace(/\s+/g, "_")}-${startDate}-to-${endDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
