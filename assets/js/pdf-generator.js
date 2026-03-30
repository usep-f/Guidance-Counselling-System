/**
 * PDF Generation Utility for Student Documents
 * Uses jsPDF (UMD version)
 */

export async function generateDocumentPDF(type, studentData, counselorSignature = "Laica Baasis-Higuerra") {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Helper to fetch images as base64
  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Could not load image:", url);
      return null;
    }
  };

  const slsuLogoData = await loadImageAsBase64('./assets/slsu%20logo.png');
  const lucenaLogoData = await loadImageAsBase64('./assets/slsu%20lucena%20logo.png');

  const drawLogo = (x, y, radius, base64Data) => {
    if (base64Data) {
      // jsPDF addImage signature: addImage(imageData, format, x, y, width, height)
      doc.addImage(base64Data, 'PNG', x - radius, y - radius, radius * 2, radius * 2);
    } else {
      doc.setDrawColor(31, 185, 129);
      doc.setFillColor(240, 240, 240);
      doc.circle(x, y, radius, 'DF');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("LOGO", x, y + 1, { align: "center", baseline: "middle" });
    }
  };

  if (type === "Good Moral Certificate") {
    // ---------------------------------------------------------
    // GOOD MORAL CERTIFICATE LAYOUT
    // ---------------------------------------------------------

    // 1. Sidebar Background
    doc.setFillColor(152, 186, 151); // Light Olive Green
    doc.rect(10, 10, 50, pageHeight - 20, 'F');
    // Top border line
    doc.setFillColor(152, 186, 151);
    doc.rect(60, 10, pageWidth - 70, 3, 'F');

    // Sidebar Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("VISION, MISSION and\nGOALS", 35, 20, { align: "center" });

    doc.setFontSize(9);
    doc.text("VISION:", 12, 35);
    doc.setFont("helvetica", "normal");
    const visionText = "A globally recognized university known for academic excellence, innovative and responsive research and extension services for national and global development.";
    doc.text(doc.splitTextToSize(visionText, 46), 12, 40);

    doc.setFont("helvetica", "bold");
    doc.text("MISSION:", 12, 70);
    doc.setFont("helvetica", "normal");
    const missionText = "SLSU shall provide global education that nurtures competent professionals who are morally grounded and responsive to community needs. The university is also committed to conduct research and extension across various fields while innovatively utilizing and regenerating its resources through sustainable environmental approaches.";
    doc.text(doc.splitTextToSize(missionText, 46), 12, 75);

    doc.setFont("helvetica", "bold");
    doc.text("GOALS:", 12, 130);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const goalsText = "1. Center for teaching excellence.\n2. Premier research university that generates S&T-based innovations.\n3. Training institution that promotes gender-responsive, climate-resilient, and community-driven development for all.\n4. Wider platform for student and personnel development.\n5. Facilities that support student learning enhancement and personnel development.\n6. Strengthened local and international academe-industry and alumni linkages.\n7. Intensifying resource generation and risk management.";
    doc.text(doc.splitTextToSize(goalsText, 46), 12, 135);

    // 2. Main Area Header
    // Logos
    drawLogo(80, 25, 10, slsuLogoData);               // Left SLSU Logo
    const headerX = (pageWidth + 60) / 2; // Center of main area
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text("REPUBLIC OF THE PHILIPPINES", headerX, 20, { align: "center" });
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("SOUTHERN LUZON STATE UNIVERSITY", headerX, 25, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text("Office of Student Affairs and Services", headerX, 30, { align: "center" });
    doc.setFont("times", "bold");
    doc.text("Guidance, Counseling, and Testing Center", headerX, 35, { align: "center" });
    doc.setFont("times", "normal");
    doc.text("Lucban, Quezon", headerX, 40, { align: "center" });

    // Inner green border
    doc.setDrawColor(152, 186, 151);
    doc.setLineWidth(1.5);
    doc.rect(62, 45, pageWidth - 74, pageHeight - 57);

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("C E R T I F I C A T I O N", headerX, 65, { align: "center" });

    // Body
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const name = studentData.name || "__________________";
    const sy = studentData.schoolYear ? `SY ${studentData.schoolYear}` : "SY ________";

    const p1 = `     This is to certify that ${name} was a student of Southern Luzon State University Lucena Campus ${sy}.`;
    const p2 = `     This is to certify further that he/she has demonstrated good moral character throughout his/her time at the University.`;
    const p3 = `     This certification is issued upon request of the interested party this ${dateStr} for whatever purpose this may serve.`;

    doc.text(doc.splitTextToSize(p1, pageWidth - 85), 70, 85);
    doc.text(doc.splitTextToSize(p2, pageWidth - 85), 70, 105);
    doc.text(doc.splitTextToSize(p3, pageWidth - 85), 70, 125);

    // Signature
    doc.setFont("times", "bold");
    const adminName = counselorSignature.toUpperCase();
    doc.text(`${adminName}`, headerX, 180, { align: "center" });
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.text("Head, Guidance, Counseling and Testing Center", headerX, 185, { align: "center" });

    // Footer
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.text("Not valid without\nthe university seal", 65, pageHeight - 20);

    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.text("AA-OSA-6.01F2, Rev.3", 10, pageHeight - 5);

  } else if (type.includes("Admission Slip")) {
    // ---------------------------------------------------------
    // ADMISSION SLIP LAYOUT
    // ---------------------------------------------------------
    // Frame for roughly half the page (A5 landscape or portrait top half)
    const margin = 20;
    const topOffset = 20;

    // Logos
    drawLogo(margin + 15, topOffset + 15, 12, slsuLogoData);     // Left SLSU Logo
    drawLogo(pageWidth - margin - 15, topOffset + 15, 12, lucenaLogoData); // Right SLSU Lucena Logo

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("ADMISSION SLIP", pageWidth / 2, topOffset + 15, { align: "center" });

    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const dateStr = new Date().toLocaleDateString('en-US');
    doc.text("Date: ", pageWidth - margin - 40, topOffset + 35);
    doc.setFont("helvetica", "bold");
    doc.text(dateStr, pageWidth - margin - 40 + doc.getTextWidth("Date: "), topOffset + 35);
    doc.setFont("helvetica", "normal");

    // To section
    const toName = studentData.professorName || "";
    doc.text("To:  ", margin, topOffset + 50);
    if (toName) {
      doc.setFont("helvetica", "bold");
      doc.text(toName, margin + doc.getTextWidth("To:  "), topOffset + 50);
      doc.setFont("helvetica", "normal");
    } else {
      doc.line(margin + doc.getTextWidth("To:  "), topOffset + 51, pageWidth - margin, topOffset + 51);
    }

    // Checkboxes logic
    const decision = studentData.admissionDecision || "Accept";
    const studentNameBox = studentData.name || "";

    // Box 1
    doc.rect(margin + 10, topOffset + 70, 4, 4);
    if (decision === "Accept") {
      doc.text("X", margin + 11.5, topOffset + 73.5, { align: "center" });
    }
    let w1 = margin + 20;
    doc.text("Please accept ", w1, topOffset + 73.5);
    w1 += doc.getTextWidth("Please accept ");
    if (studentNameBox) {
      doc.setFont("helvetica", "bold");
      doc.text(studentNameBox, w1, topOffset + 73.5);
      w1 += doc.getTextWidth(studentNameBox);
      doc.setFont("helvetica", "normal");
    } else {
      doc.line(w1, topOffset + 74.5, w1 + 55, topOffset + 74.5);
      w1 += 55;
    }
    doc.text(" in your class.", w1, topOffset + 73.5);

    // Box 2
    doc.rect(margin + 10, topOffset + 90, 4, 4);
    if (decision === "Do Not Accept") {
      doc.text("X", margin + 11.5, topOffset + 93.5, { align: "center" });
    }
    let w2 = margin + 20;
    doc.text("Please do not accept ", w2, topOffset + 93.5);
    w2 += doc.getTextWidth("Please do not accept ");
    if (studentNameBox) {
      doc.setFont("helvetica", "bold");
      doc.text(studentNameBox, w2, topOffset + 93.5);
      w2 += doc.getTextWidth(studentNameBox);
      doc.setFont("helvetica", "normal");
    } else {
      doc.line(w2, topOffset + 94.5, w2 + 55, topOffset + 94.5);
      w2 += 55;
    }
    doc.text(" in your class.", w2, topOffset + 93.5);

    // Reason section
    doc.text("Reason for accepting/not accepting:", margin, topOffset + 120);

    const reasonText = studentData.adminReason || "";
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(reasonText, pageWidth - margin * 2), margin, topOffset + 130);

    // Lines below the reason
    doc.line(margin, topOffset + 135, pageWidth - margin, topOffset + 135);
    doc.line(margin, topOffset + 145, pageWidth - margin, topOffset + 145);

    // Signature Area
    const coordName = counselorSignature || "_______________________"; // Or whatever length you need
    doc.setFont("helvetica", "normal");
    
    // The center of the signature line is (pageWidth - margin - 30)
    doc.text(coordName, pageWidth - margin - 30, topOffset + 175, { align: "center" });
    doc.line(pageWidth - margin - 60, topOffset + 176, pageWidth - margin, topOffset + 176);
    
    doc.setFontSize(10);
    doc.text("Guidance Coordinator", pageWidth - margin - 30, topOffset + 182, { align: "center" });
  }

  doc.save(`${type.replace(/\s+/g, '_')}_${studentData.studentNo || 'Document'}.pdf`);
}
