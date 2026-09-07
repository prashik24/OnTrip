/* import PDFDocument from "pdfkit";

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export function generateInvoicePdfBuffer({ booking, provider }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fillColor("#00b8f1")
      .fontSize(26)
      .font("Helvetica-Bold")
      .text("OnTrip");

    doc
      .moveDown(0.3)
      .fillColor("#0b1b2a")
      .fontSize(18)
      .text("Booking Invoice", { align: "right" });

    doc.moveDown(1);

    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#4b5563")
      .text(`Booking Ref: ${booking.bookingRef}`)
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`)
      .text(`Payment Status: ${booking.paymentStatus}`)
      .text(`Booking Status: ${booking.bookingStatus}`);

    doc.moveDown(1);

    doc
      .roundedRect(48, doc.y, 500, 28, 8)
      .fill("#eaf8ff")
      .fillColor("#0b1b2a")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Customer Details", 60, doc.y - 20);

    doc.moveDown(1.7);
    doc.font("Helvetica").fontSize(11);
    doc.text(`Name: ${booking.contactName}`);
    doc.text(`Email: ${booking.contactEmail || "-"}`);
    doc.text(`Phone: ${booking.contactPhone}`);

    doc.moveDown(1);

    doc
      .roundedRect(48, doc.y, 500, 28, 8)
      .fill("#eaf8ff")
      .fillColor("#0b1b2a")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Service Details", 60, doc.y - 20);

    doc.moveDown(1.7);
    doc.font("Helvetica").fontSize(11);
    doc.text(`Provider: ${provider.businessName}`);
    doc.text(`Service: ${booking.serviceTitle}`);
    doc.text(`Type: ${booking.serviceType === "vehicle" ? "Vehicle Service" : "Travel Planner"}`);
    doc.text(`Travel Date: ${new Date(booking.bookingDate).toLocaleDateString()}`);
    if (booking.destination) doc.text(`Destination: ${booking.destination}`);
    if (booking.place) doc.text(`Place: ${booking.place}`);
    if (booking.selectedVehicleTitle) doc.text(`Vehicle: ${booking.selectedVehicleTitle}`);
    if (booking.selectedPackageTitle) doc.text(`Package: ${booking.selectedPackageTitle}`);
    doc.text(`Days: ${booking.days || 1}`);
    doc.text(`People: ${booking.peopleCount || 1}`);
    if (booking.pricingLabel) doc.text(`Pricing: ${booking.pricingLabel}`);

    doc.moveDown(1);

    const tableTop = doc.y;
    const left = 48;
    const col1 = 60;
    const col2 = 250;
    const col3 = 140;
    const col4 = 100;

    doc
      .rect(left, tableTop, col1 + col2 + col3 + col4, 26)
      .fill("#00b8f1");

    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11);
    doc.text("Qty", left + 12, tableTop + 8, { width: col1 - 20 });
    doc.text("Item", left + col1 + 12, tableTop + 8, { width: col2 - 20 });
    doc.text("Unit Price", left + col1 + col2 + 12, tableTop + 8, {
      width: col3 - 20,
    });
    doc.text("Total", left + col1 + col2 + col3 + 12, tableTop + 8, {
      width: col4 - 20,
    });

    const rowTop = tableTop + 26;
    doc
      .rect(left, rowTop, col1 + col2 + col3 + col4, 34)
      .fill("#f8fbff");

    doc.fillColor("#0b1b2a").font("Helvetica").fontSize(11);
    const qty =
      booking.serviceType === "vehicle"
        ? Number(booking.days || 1)
        : Number(booking.peopleCount || 1);

    const itemName =
      booking.serviceType === "vehicle"
        ? booking.selectedVehicleTitle || booking.serviceTitle
        : booking.selectedPackageTitle || booking.serviceTitle;

    doc.text(String(qty), left + 12, rowTop + 10, { width: col1 - 20 });
    doc.text(itemName, left + col1 + 12, rowTop + 10, { width: col2 - 20 });
    doc.text(money(booking.unitPrice), left + col1 + col2 + 12, rowTop + 10, {
      width: col3 - 20,
    });
    doc.text(money(booking.amount), left + col1 + col2 + col3 + 12, rowTop + 10, {
      width: col4 - 20,
    });

    doc.moveDown(4);

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#0b1b2a")
      .text(`Grand Total: ${money(booking.amount)}`, { align: "right" });

    doc.moveDown(1);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#6b7280")
      .text("Thank you for booking with OnTrip.", { align: "center" });

    doc.end();
  });
}  */

import PDFDocument from "pdfkit";

/**
 * PDFKit standard fonts (Helvetica) do not bundle the Unicode '₹' glyph.
 * 'Rs. ' guarantees clean cross-platform rendering without requiring custom TTF font files.
 */
function money(value) {
  const num = Number(value || 0);
  return `Rs. ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateInvoicePdfBuffer({ booking = {}, provider = {} }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const colors = {
      primary: "#00b8f1",
      darkNavy: "#0b1b2a",
      mutedGray: "#64748b",
      lightBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      badgeBg: "#eaf8ff",
      white: "#ffffff",
      textDark: "#1f2937",
    };

    const left = 48;
    const pageWidth = 595.28;
    const contentWidth = pageWidth - left * 2; // ~499.28 pt
    const rightMargin = left + contentWidth;

    let cursorY = 48;

    // --- 1. HEADER & INVOICE META ---
    doc.rect(left, cursorY, contentWidth, 3).fill(colors.primary);
    cursorY += 14;

    doc
      .fillColor(colors.primary)
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("OnTrip", left, cursorY);

    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica")
      .fontSize(9)
      .text("Travel & Transport Solutions", left, cursorY + 26);

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
      .fontSize(9)
      .text(`Booking Ref: ${booking.bookingRef || "-"}`, left, cursorY + 22, { align: "right" })
      .text(`Invoice Date: ${invoiceDate}`, left, cursorY + 34, { align: "right" });

    cursorY += 56;

    // --- 2. STATUS RIBBON ---
    const ribbonH = 26;
    doc
      .roundedRect(left, cursorY, contentWidth, ribbonH, 4)
      .fillColor(colors.lightBg)
      .strokeColor(colors.cardBorder)
      .fillAndStroke();

    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("PAYMENT STATUS: ", left + 14, cursorY + 8, { continued: true })
      .fillColor(booking.paymentStatus === "PAID" ? "#059669" : "#d97706")
      .text(String(booking.paymentStatus || "PENDING").toUpperCase(), { continued: false });

    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("BOOKING STATUS: ", left + 260, cursorY + 8, { continued: true })
      .fillColor(colors.primary)
      .text(String(booking.bookingStatus || "CONFIRMED").toUpperCase(), { continued: false });

    cursorY += ribbonH + 16;

    // --- 3. CUSTOMER & SERVICE DETAIL CARDS ---
    const colGap = 16;
    const colW = (contentWidth - colGap) / 2;
    const cardH = 150; // Sized to accommodate dynamic rows safely

    const renderCard = (x, y, title, fields) => {
      doc
        .roundedRect(x, y, colW, cardH, 6)
        .fillColor(colors.white)
        .strokeColor(colors.cardBorder)
        .fillAndStroke();

      doc
        .roundedRect(x, y, colW, 24, 4)
        .fillColor(colors.badgeBg)
        .fill();

      doc
        .fillColor(colors.darkNavy)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(title, x + 10, y + 7);

      let fieldY = y + 32;
      fields.forEach(({ label, val }) => {
        if (val !== undefined && val !== null && val !== "") {
          doc
            .fillColor(colors.mutedGray)
            .font("Helvetica-Bold")
            .fontSize(8.5)
            .text(`${label}: `, x + 10, fieldY, { continued: true })
            .fillColor(colors.textDark)
            .font("Helvetica")
            .text(String(val), { width: colW - 20, lineBreak: false });
          fieldY += 14.5;
        }
      });
    };

    // Column 1: Customer Details
    renderCard(left, cursorY, "CUSTOMER DETAILS", [
      { label: "Name", val: booking.contactName },
      { label: "Email", val: booking.contactEmail || "-" },
      { label: "Phone", val: booking.contactPhone },
    ]);

    // Column 2: Service Details
    const col2X = left + colW + colGap;
    const isVehicle = booking.serviceType === "vehicle";
    const subTitle = isVehicle ? booking.selectedVehicleTitle : booking.selectedPackageTitle;

    renderCard(col2X, cursorY, "SERVICE DETAILS", [
      { label: "Provider", val: provider.businessName },
      { label: "Service", val: booking.serviceTitle },
      { label: "Type", val: isVehicle ? "Vehicle Service" : "Travel Planner" },
      { label: "Travel Date", val: booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString("en-IN") : "-" },
      { label: "Destination", val: booking.destination },
      { label: "Place", val: booking.place },
      { label: isVehicle ? "Vehicle" : "Package", val: subTitle },
      { label: "Units", val: `${booking.days || 1} Day(s), ${booking.peopleCount || 1} Person(s)` },
    ]);

    cursorY += cardH + 18;

    // --- 4. ITEM TABLE ---
    const c1W = 239; // Description
    const c2W = 60;  // Qty
    const c3W = 100; // Unit Price
    const c4W = 100; // Total
    const thH = 24;

    doc.rect(left, cursorY, contentWidth, thH).fillColor(colors.primary).fill();

    doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(9);
    doc.text("ITEM & DESCRIPTION", left + 10, cursorY + 7, { width: c1W - 10 });
    doc.text("QTY", left + c1W, cursorY + 7, { width: c2W, align: "center" });
    doc.text("UNIT PRICE", left + c1W + c2W, cursorY + 7, { width: c3W - 10, align: "right" });
    doc.text("TOTAL", left + c1W + c2W + c3W, cursorY + 7, { width: c4W - 10, align: "right" });

    cursorY += thH;

    // Table Data Row
    const trH = 34;
    doc
      .rect(left, cursorY, contentWidth, trH)
      .fillColor(colors.lightBg)
      .strokeColor(colors.cardBorder)
      .fillAndStroke();

    const qty = isVehicle ? Number(booking.days || 1) : Number(booking.peopleCount || 1);
    const itemName = (isVehicle ? booking.selectedVehicleTitle : booking.selectedPackageTitle) || booking.serviceTitle;

    doc
      .fillColor(colors.darkNavy)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(itemName, left + 10, cursorY + 6, { width: c1W - 15, ellipsis: true });

    if (booking.pricingLabel) {
      doc
        .fillColor(colors.mutedGray)
        .font("Helvetica")
        .fontSize(7.5)
        .text(`Rate: ${booking.pricingLabel}`, left + 10, cursorY + 18, { width: c1W - 15 });
    }

    doc
      .fillColor(colors.darkNavy)
      .font("Helvetica")
      .fontSize(9)
      .text(String(qty), left + c1W, cursorY + 11, { width: c2W, align: "center" });

    doc.text(money(booking.unitPrice), left + c1W + c2W, cursorY + 11, {
      width: c3W - 10,
      align: "right",
    });

    doc
      .font("Helvetica-Bold")
      .text(money(booking.amount), left + c1W + c2W + c3W, cursorY + 11, {
        width: c4W - 10,
        align: "right",
      });

    cursorY += trH + 20;

    // --- 5. TOTALS BLOCK ---
    const totalBoxW = 210;
    const totalBoxX = rightMargin - totalBoxW;

    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica")
      .fontSize(9)
      .text("Subtotal:", totalBoxX, cursorY, { width: 90 })
      .fillColor(colors.darkNavy)
      .font("Helvetica-Bold")
      .text(money(booking.amount), totalBoxX + 90, cursorY, {
        width: totalBoxW - 90,
        align: "right",
      });

    cursorY += 16;

    const grandTotalBoxH = 30;
    doc
      .roundedRect(totalBoxX, cursorY, totalBoxW, grandTotalBoxH, 4)
      .fillColor(colors.darkNavy)
      .fill();

    doc
      .fillColor(colors.white)
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .text("GRAND TOTAL", totalBoxX + 12, cursorY + 9);

    doc
      .fillColor(colors.primary)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(money(booking.amount), totalBoxX + 90, cursorY + 8, {
        width: totalBoxW - 102,
        align: "right",
      });

    // --- 6. FOOTER ---
    const footerY = doc.page.height - 65;

    doc
      .moveTo(left, footerY - 10)
      .lineTo(rightMargin, footerY - 10)
      .lineWidth(0.5)
      .strokeColor(colors.cardBorder)
      .stroke();

    doc
      .fillColor(colors.darkNavy)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Thank you for booking with OnTrip.", left, footerY, {
        align: "center",
        width: contentWidth,
      });

    doc
      .fillColor(colors.mutedGray)
      .font("Helvetica")
      .fontSize(8)
      .text("This is a computer-generated document. For queries, contact support.", left, footerY + 13, {
        align: "center",
        width: contentWidth,
      });

    doc.end();
  });
}
