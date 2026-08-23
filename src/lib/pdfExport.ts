import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { college } from './college';

interface PdfExportOptions {
  rows: Array<{
    roll: string;
    reg: string;
    name: string;
    subject: string;
    total: number;
    present: number;
    absent: number;
    percentage: number;
  }>;
  periodLabel: string;
  scopeLabel: string;
}

export function exportAttendancePdf({ rows, periodLabel, scopeLabel }: PdfExportOptions) {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Header Banner
  doc.setFillColor(34, 76, 56);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(college.name, 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${college.tagline} · Official Attendance Report`, 14, 19);

  // Metadata Box
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Details', 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Period: ${periodLabel}`, 14, 44);
  doc.text(`Filter / Scope: ${scopeLabel}`, 14, 50);
  doc.text(`Generated On: ${new Date().toLocaleString()}`, 130, 44);
  doc.text(`Minimum Required: ${college.minAttendance}%`, 130, 50);

  // Table Data
  const tableRows = rows.map(r => [
    r.roll,
    r.reg || '—',
    r.name,
    r.subject,
    r.total.toString(),
    r.present.toString(),
    r.absent.toString(),
    `${r.percentage}%`
  ]);

  autoTable(doc, {
    startY: 56,
    head: [['Roll No', 'Reg No', 'Student Name', 'Subject', 'Total', 'Present', 'Absent', 'Attendance %']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [34, 76, 56], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 248] },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 7) {
        const val = parseFloat(data.cell.raw as string);
        if (val < college.minAttendance) {
          data.cell.styles.textColor = [220, 38, 38];
        } else {
          data.cell.styles.textColor = [22, 101, 52];
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  if (finalY < 260) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    doc.line(14, finalY + 15, 60, finalY + 15);
    doc.text('Prepared by (Teacher)', 14, finalY + 20);

    doc.line(80, finalY + 15, 130, finalY + 15);
    doc.text('Head of Department (HOD)', 80, finalY + 20);

    doc.line(150, finalY + 15, 196, finalY + 15);
    doc.text('Principal / Dean Sign', 150, finalY + 20);
  }

  doc.save(`Attendance-Report-${new Date().toISOString().split('T')[0]}.pdf`);
}
