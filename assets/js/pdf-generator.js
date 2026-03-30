/**
 * PDF Generation Utility for Student Documents
 * Uses jsPDF (UMD version)
 */

export async function generateDocumentPDF(type, studentData, counselorSignature = "Guidance Counselor") {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: type.startsWith("Admission Slip") ? 'portrait' : 'portrait',
    format: type.startsWith("Admission Slip") ? 'a5' : 'a4' // Admission slip makes sense as A5 (half page)
  });

  // Common colors
  const slsuGreen = [59, 122, 87]; // Approx SLSU dark green
  const textColor = [0, 0, 0];

  if (type === "Good Moral Certificate") {
    generateGoodMoral(doc, studentData, counselorSignature, slsuGreen);
  } else if (type.startsWith("Admission Slip")) {
    generateAdmissionSlip(doc, studentData, counselorSignature, slsuGreen);
  }

  doc.save(`${type.replace(/\s+/g, '_')}_${studentData.studentNo || 'Document'}.pdf`);
}

function generateAdmissionSlip(doc, studentData, counselorSignature, slsuGreen) {
  // A5 dimensions: 148 x 210 mm
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...textColor);

  // Logos (Placeholders)
  doc.setDrawColor(...slsuGreen);
  doc.setFillColor(240, 240, 240);
  doc.circle(30, 30, 10, 'FD'); // Left Logo Placeholder
  doc.circle(118, 30, 10, 'FD'); // Right Logo Placeholder

  // Header
  doc.text("ADMISSION SLIP", 74, 32, { align: "center" });

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  doc.text(`Date: ${currentDate}`, 118, 50, { align: "right" });
  doc.line(80, 51, 118, 51); // Date underline

  // To:
  doc.setFont("helvetica", "normal");
  doc.text(`To: `, 20, 65);
  const instructorName = studentData.instructorName || "";
  doc.text(instructorName, 30, 64);
  doc.line(30, 66, 118, 66); // To: underline

  // Checkboxes & Accept/Decline lines
  const studentName = studentData.name || "(Student Name)";

  // Checkbox 1
  doc.rect(20, 80, 4, 4); // Checkbox
  doc.text("Please accept", 30, 84);
  doc.text(studentName, 55, 83);
  doc.line(55, 85, 118, 85); // Name underline
  doc.setFontSize(9);
  doc.text("in your class.", 55, 90);

  // Checkbox 2
  doc.setFontSize(10);
  doc.rect(20, 105, 4, 4); // Checkbox
  doc.text("Please do not accept", 30, 109);
  doc.text(studentName, 65, 108);
  doc.line(65, 110, 118, 110); // Name underline
  doc.setFontSize(9);
  doc.text("in your class.", 65, 115);

  // Reason Section
  doc.setFontSize(10);
  doc.text("Reason for accepting/not accepting: ", 20, 135);
  doc.line(75, 136, 128, 136);
  doc.line(20, 146, 128, 146);
  doc.line(20, 156, 128, 156);

  // Footer / Signature
  doc.text(counselorSignature, 128, 185, { align: "right" });
  doc.text("Guidance Coordinator", 128, 190, { align: "right" });
  doc.line(20, 195, 128, 195); // Bottom border line
}

function generateGoodMoral(doc, studentData, counselorSignature, slsuGreen) {
  // A4 dimensions: 210 x 297 mm

  // Draw the green border around the main content (Right side)
  doc.setDrawColor(...slsuGreen);
  doc.setLineWidth(1.5);
  doc.rect(55, 15, 145, 267); // x, y, width, height

  // Draw the green sidebar (Left side)
  doc.setFillColor(152, 193, 145); // Light greenish tint matching the image
  doc.rect(10, 15, 40, 267, 'F');

  // Sidebar Header Background
  doc.setFillColor(...slsuGreen);
  doc.rect(10, 15, 40, 15, 'F');

  // Sidebar Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("VISION, MISSION and", 30, 20, { align: "center" });
  doc.text("GOALS", 30, 24, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  doc.text("VISION:", 12, 35);
  doc.setFont("helvetica", "normal");
  const visionText = "A globally recognized university known for academic excellence, innovative and responsive research and extension services for national and global development.";
  const splitVision = doc.splitTextToSize(visionText, 36);
  doc.text(splitVision, 12, 40);

  doc.setFont("helvetica", "bold");
  doc.text("MISSION:", 12, 65);
  doc.setFont("helvetica", "normal");
  const missionText = "SLSU shall provide global education that nurtures competent professionals who are morally grounded and responsive to community needs. The university is also committed to conduct research and extension across various fields while innovatively utilizing and regenerating its resources through sustainable environmental approaches.";
  const splitMission = doc.splitTextToSize(missionText, 36);
  doc.text(splitMission, 12, 70);

  doc.setFont("helvetica", "bold");
  doc.text("GOALS:", 12, 115);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const goals = [
    "1. Center for teaching excellence.",
    "2. Premier research university that generates S&T-based innovations.",
    "3. Training institution that promotes gender-responsive, climate-resilient, and community-driven development for all.",
    "4. Wider platform for student and personnel development.",
    "5. Facilities that support student learning enhancement and personnel development.",
    "6. Strengthened local and international academe-industry and alumni linkages.",
    "7. Intensifying resource generation and risk management."
  ];
  let goalY = 120;
  goals.forEach(g => {
    const splitG = doc.splitTextToSize(g, 36);
    doc.text(splitG, 12, goalY);
    goalY += splitG.length * 3;
  });

  // Sidebar Address (Bottom)
  doc.setFontSize(5);
  doc.text("Address: Brgy. Kulapi, Quezon Ave.,", 30, 250, { align: "center" });
  doc.text("Lucban, Quezon", 30, 253, { align: "center" });
  doc.text("Telephone No.: (042) 540 - 3949", 30, 256, { align: "center" });
  doc.text("E-mail address:", 30, 259, { align: "center" });
  doc.text("slsu_guidanceoffice@slsu.edu.ph", 30, 262, { align: "center" });

  // --- Main Content Area ---

  // Logo Placeholder
  doc.setDrawColor(...slsuGreen);
  doc.setFillColor(240, 240, 240);
  doc.circle(75, 35, 12, 'FD'); // Logo

  // Main Header
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("REPUBLIC OF THE PHILIPPINES", 140, 25, { align: "center" });
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("SOUTHERN LUZON STATE UNIVERSITY", 140, 30, { align: "center" });
  doc.setFont("times", "bold");
  doc.text("Office of Student Affairs and Services", 140, 35, { align: "center" });
  doc.setFont("times", "bold");
  doc.text("Guidance, Counseling, and Testing Center", 140, 40, { align: "center" });
  doc.setFont("times", "normal");
  doc.text("Lucban, Quezon", 140, 45, { align: "center" });

  // Certificate Title
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  // Add some character spacing effect by adding spaces between letters
  doc.text("C E R T I F I C A T I O N", 125, 75, { align: "center" });

  // Body Content
  doc.setFont("times", "normal");
  doc.setFontSize(12);

  const studentName = (studentData.name || "____________________").toUpperCase();
  const schoolYear = studentData.schoolYear || "___________";

  const para1 = `This is to certify that ${studentName} was a student of Southern Luzon State University Lucena Campus SY ${schoolYear}.`;

  const para2 = `This is to certify further that he/she has demonstrated good moral character throughout his/her time at the University.`;

  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const para3 = `This certification is issued upon request of the interested party this ${currentDate} for whatever purpose this may serve.`;

  // Draw paragraphs with indentation
  const startX = 65;
  const wrapWidth = 125;

  let currentY = 100;

  // Para 1
  doc.text("      " + para1, startX, currentY, { maxWidth: wrapWidth, align: "justify" });
  currentY += doc.splitTextToSize(para1, wrapWidth).length * 6 + 10;

  // Para 2
  doc.text("      " + para2, startX, currentY, { maxWidth: wrapWidth, align: "justify" });
  currentY += doc.splitTextToSize(para2, wrapWidth).length * 6 + 10;

  // Para 3
  doc.text("      " + para3, startX, currentY, { maxWidth: wrapWidth, align: "justify" });

  // Signatory
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  const counselor = (counselorSignature || "(GUIDANCE COUNSELOR NAME)").toUpperCase();
  doc.text(counselor, 150, 220, { align: "center" });
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.text("Head, Guidance, Counseling and Testing Center", 150, 225, { align: "center" });

  // Footer Notices
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.text("Not valid without", 60, 275);
  doc.text("the university seal", 60, 280);

  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.text("AA-OSA-6.01F2, Rev.3", 10, 290);
}
