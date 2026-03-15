import PDFDocument from "pdfkit";

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
}