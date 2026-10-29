import PDFDocument from "pdfkit";

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export function buildInvoicePdfBuffer({ booking, user, provider }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(24).fillColor("#00b8f1").text("OnTrip Invoice", { align: "left" });
    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .fillColor("#444")
      .text(`Booking Code: ${booking.bookingCode || "-"}`)
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`)
      .text(`Payment Status: ${booking.paymentStatus || "-"}`)
      .text(`Booking Status: ${booking.bookingStatus || "-"}`);

    doc.moveDown(1);

    doc.fontSize(16).fillColor("#0b1b2a").text("Customer Details");
    doc.moveDown(0.4);
    doc
      .fontSize(11)
      .fillColor("#333")
      .text(`Name: ${booking.contactName || user?.name || "-"}`)
      .text(`Email: ${booking.contactEmail || user?.email || "-"}`)
      .text(`Phone: ${booking.contactPhone || user?.phone || "-"}`);

    doc.moveDown(1);

    doc.fontSize(16).fillColor("#0b1b2a").text("Service Details");
    doc.moveDown(0.4);
    doc
      .fontSize(11)
      .fillColor("#333")
      .text(`Provider: ${provider?.businessName || booking.serviceTitle || "-"}`)
      .text(`Service Type: ${booking.serviceType === "vehicle" ? "Vehicle Service" : "Travel Planner"}`)
      .text(`Service Title: ${booking.serviceTitle || "-"}`)
      .text(`Booking Date: ${booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : "-"}`)
      .text(`Destination: ${booking.destination || "-"}`)
      .text(`Place: ${booking.place || "-"}`)
      .text(`Vehicle: ${booking.selectedVehicleTitle || "-"}`)
      .text(`Package: ${booking.selectedPackageTitle || "-"}`)
      .text(`Days: ${booking.days || 1}`)
      .text(`People: ${booking.peopleCount || 1}`)
      .text(`Pricing: ${booking.pricingLabel || "-"}`);

    doc.moveDown(1);

    doc.fontSize(16).fillColor("#0b1b2a").text("Amount Summary");
    doc.moveDown(0.4);
    doc
      .fontSize(11)
      .fillColor("#333")
      .text(`Unit Price: ${money(booking.unitPrice)}`)
      .text(`Total Amount Paid: ${money(booking.amount)}`)
      .text(`Currency: ${booking.currency || "INR"}`);

    if (booking.notes) {
      doc.moveDown(1);
      doc.fontSize(16).fillColor("#0b1b2a").text("Notes");
      doc.moveDown(0.4);
      doc.fontSize(11).fillColor("#333").text(booking.notes);
    }

    if (booking.statusReason) {
      doc.moveDown(1);
      doc.fontSize(16).fillColor("#0b1b2a").text("Status Reason");
      doc.moveDown(0.4);
      doc.fontSize(11).fillColor("#333").text(booking.statusReason);
    }

    doc.moveDown(2);
    doc
      .fontSize(10)
      .fillColor("#666")
      .text("Thank you for booking with OnTrip.", { align: "center" });

    doc.end();
  });
}