import PDFDocument from "pdfkit";

/**
 * Safe currency formatter for standard PDF fonts.
 * PDFKit's default Helvetica font does not contain the Unicode '₹' character.
 * Using 'INR ' or 'Rs. ' ensures error-free rendering across all PDF readers.
 */
function formatMoney(value, currencyPrefix = "INR ") {
  const num = Number(value || 0);
  const formatted = num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currencyPrefix}${formatted}`;
}

export function generateInvoicePdfBuffer({ booking, provider }) {
  return new Promise((resolve, reject) => {
    // A4 Dimensions: 595.28 x 841.89 pt
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Modern Color Palette
    const colors = {
      primary: "#00b8f1",     // Brand Cyan
      darkNavy: "#0b1b2a",    // Dark Slate Header & Primary Text
      mutedGray: "#64748b",   // Muted Labels & Secondary Text
      lightBg: "#f8fafc",     // Card Background
      cardBorder: "#e2e8f0",  // Light Border Line
      badgeBg: "#eaf8ff",     // Section Header Strip
      white: "#ffffff",
    };

    const left = 48;
    const pageWidth = 595.28;
    const contentWidth = pageWidth - left * 2; // ~499.28 pt printable area
    const rightMargin = left + contentWidth;

    let cursorY = 48;

    // =========================================================================
    // 1. BRAND HEADER & INVOICE METADATA
    // =========================================================================
    // Top Accent Bar
    doc.rect(left, cursorY, contentWidth, 4).fill(colors.primary);
    cursorY += 16;

    // Brand Title & Subtitle
    doc
      .fillColor(colors.primary)
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("OnTrip", left, cursorY);

    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica")
      .fontSize(9)
      .text("Travel & Transport Solutions", left, cursorY + 28);

    // Right-aligned Invoice Title & Ref details
    const invoiceDate = booking.bookingDate
      ? new Date(booking.bookingDate).toLocaleDateString("en-IN")
      : new Date().toLocaleDateString("en-IN");

    doc
      .fillColor(colors.darkNavy)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("BOOKING INVOICE", left, cursorY, { align: "right" });

    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica")
      .fontSize(9.5)
      .text(`Invoice Ref: ${booking.bookingRef || "N/A"}`, left, cursorY + 22, { align: "right" })
      .text(`Invoice Date: ${invoiceDate}`, left, cursorY + 36, { align: "right" });

    cursorY += 60;

    // =========================================================================
    // 2. STATUS RIBBON
    // =========================================================================
    const ribbonH = 28;
    doc
      .roundedRect(left, cursorY, contentWidth, ribbonH, 6)
      .fillAndStroke(colors.lightBg, colors.cardBorder);

    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("PAYMENT STATUS: ", left + 14, cursorY + 9, { continued: true })
      .fillColor(booking.paymentStatus === "PAID" ? "#059669" : "#d97706")
      .text(String(booking.paymentStatus || "PENDING").toUpperCase());

    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("BOOKING STATUS: ", left + 260, cursorY + 9, { continued: true })
      .fillColor(colors.primary)
      .text(String(booking.bookingStatus || "CONFIRMED").toUpperCase());

    cursorY += ribbonH + 16;

    // =========================================================================
    // 3. 2-COLUMN DETAILS GRID (Customer & Service)
    // =========================================================================
    const colGap = 16;
    const colW = (contentWidth - colGap) / 2; // ~241.64 pt width
    const cardH = 135;

    const drawCardHeader = (x, y, title) => {
      // Draw light blue background header pill inside card
      doc
        .path(`M ${x + 6} ${y} L ${x + colW - 6} ${y} Q ${x + colW} ${y} ${x + colW} ${y + 6} L ${x + colW} ${y + 24} L ${x} ${y + 24} L ${x} ${y + 6} Q ${x} ${y} ${x + 6} ${y} Z`)
        .fill(colors.badgeBg);

      doc
        .fillColor(colors.darkNavy)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(title, x + 12, y + 7);
    };

    const drawField = (label, val, x, y, maxW) => {
      doc
        .fillColor(colors.mutedGray)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(`${label}: `, x, y, { continued: true })
        .fillColor(colors.darkNavy)
        .font("Helvetica")
        .text(val || "-", { width: maxW, lineBreak: false });
    };

    // --- Column 1: Customer Details ---
    doc
      .roundedRect(left, cursorY, colW, cardH, 6)
      .fillAndStroke(colors.white, colors.cardBorder);
    drawCardHeader(left, cursorY, "CUSTOMER DETAILS");

    let custY = cursorY + 34;
    drawField("Name", booking.contactName, left + 12, custY, colW - 24);
    custY += 18;
    drawField("Email", booking.contactEmail, left + 12, custY, colW - 24);
    custY += 18;
    drawField("Phone", booking.contactPhone, left + 12, custY, colW - 24);

    // --- Column 2: Service Details ---
    const col2X = left + colW + colGap;
    doc
      .roundedRect(col2X, cursorY, colW, cardH, 6)
      .fillAndStroke(colors.white, colors.cardBorder);
    drawCardHeader(col2X, cursorY, "SERVICE DETAILS");

    let servY = cursorY + 34;
    drawField("Provider", provider?.businessName, col2X + 12, servY, colW - 24);
    servY += 16;
    drawField("Service", booking.serviceTitle, col2X + 12, servY, colW - 24);
    servY += 16;
    drawField(
      "Type",
      booking.serviceType === "vehicle" ? "Vehicle Service" : "Travel Planner",
      col2X + 12,
      servY,
      colW - 24
    );
    servY += 16;
    drawField("Travel Date", invoiceDate, col2X + 12, servY, colW - 24);
    servY += 16;

    const subItemLabel = booking.serviceType === "vehicle" ? "Vehicle" : "Package";
    const subItemVal =
      booking.serviceType === "vehicle"
        ? booking.selectedVehicleTitle
        : booking.selectedPackageTitle;

    if (subItemVal) {
      drawField(subItemLabel, subItemVal, col2X + 12, servY, colW - 24);
      servY += 16;
    }

    drawField(
      "Duration",
      `${booking.days || 1} Day(s) • ${booking.peopleCount || 1} Person(s)`,
      col2X + 12,
      servY,
      colW - 24
    );

    cursorY += cardH + 20;

    // =========================================================================
    // 4. ITEMIZED SERVICE TABLE
    // =========================================================================
    // Column widths summing exactly to contentWidth (499.28 pt)
    const c1W = 229; // Item & Description
    const c2W = 70;  // Qty / Days
    const c3W = 100; // Unit Price
    const c4W = 100; // Total

    const thH = 26;
    doc.rect(left, cursorY, contentWidth, thH).fill(colors.primary);

    doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(9.5);
    doc.text("ITEM & DESCRIPTION", left + 10, cursorY + 8, { width: c1W - 10 });
    doc.text("QTY / DAYS", left + c1W, cursorY + 8, { width: c2W, align: "center" });
    doc.text("UNIT PRICE", left + c1W + c2W, cursorY + 8, { width: c3W - 10, align: "right" });
    doc.text("TOTAL", left + c1W + c2W + c3W, cursorY + 8, { width: c4W - 10, align: "right" });

    cursorY += thH;

    // Table Data Row
    const trH = 36;
    doc
      .rect(left, cursorY, contentWidth, trH)
      .fillAndStroke(colors.lightBg, colors.cardBorder);

    const qty =
      booking.serviceType === "vehicle"
        ? Number(booking.days || 1)
        : Number(booking.peopleCount || 1);

    const itemName =
      (booking.serviceType === "vehicle"
        ? booking.selectedVehicleTitle
        : booking.selectedPackageTitle) || booking.serviceTitle;

    doc
      .fillColor(colors.darkNavy)
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .text(itemName, left + 10, cursorY + 8, { width: c1W - 20, ellipsis: true });

    if (booking.pricingLabel) {
      doc
        .fillColor(colors.mutedGray)
        .font("Helvetica")
        .fontSize(8)
        .text(`Rate: ${booking.pricingLabel}`, left + 10, cursorY + 20, { width: c1W - 20 });
    }

    doc
      .fillColor(colors.darkNavy)
      .font("Helvetica")
      .fontSize(9.5)
      .text(String(qty), left + c1W, cursorY + 12, { width: c2W, align: "center" });

    doc.text(formatMoney(booking.unitPrice), left + c1W + c2W, cursorY + 12, {
      width: c3W - 10,
      align: "right",
    });

    doc
      .font("Helvetica-Bold")
      .text(formatMoney(booking.amount), left + c1W + c2W + c3W, cursorY + 12, {
        width: c4W - 10,
        align: "right",
      });

    cursorY += trH + 24;

    // =========================================================================
    // 5. TOTALS BLOCK
    // =========================================================================
    const totalBoxW = 220;
    const totalBoxX = rightMargin - totalBoxW;

    // Subtotal Line
    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica")
      .fontSize(9.5)
      .text("Subtotal:", totalBoxX, cursorY, { width: 100 })
      .fillColor(colors.darkNavy)
      .font("Helvetica-Bold")
      .text(formatMoney(booking.amount), totalBoxX + 100, cursorY, {
        width: totalBoxW - 100,
        align: "right",
      });

    cursorY += 18;

    // Grand Total Badge Box
    const grandTotalBoxH = 32;
    doc
      .roundedRect(totalBoxX, cursorY, totalBoxW, grandTotalBoxH, 6)
      .fill(colors.darkNavy);

    doc
      .fillColor(colors.white)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("GRAND TOTAL", totalBoxX + 14, cursorY + 10);

    doc
      .fillColor(colors.primary)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(formatMoney(booking.amount), totalBoxX + 100, cursorY + 9, {
        width: totalBoxW - 114,
        align: "right",
      });

    // =========================================================================
    // 6. FOOTER SECTION
    // =========================================================================
    const footerY = doc.page.height - 70;

    // Divider Line
    doc
      .moveTo(left, footerY - 12)
      .lineTo(rightMargin, footerY - 12)
      .lineWidth(0.5)
      .strokeColor(colors.cardBorder)
      .stroke();

    doc
      .fillColor(colors.darkNavy)
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .text("Thank you for booking with OnTrip!", left, footerY, {
        align: "center",
        width: contentWidth,
      });

    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica")
      .fontSize(8.5)
      .text("This is a computer-generated invoice. For any queries, contact support@ontrip.com", left, footerY + 14, {
        align: "center",
        width: contentWidth,
      });

    doc.end();
  });
}
