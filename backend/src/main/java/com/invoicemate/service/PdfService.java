package com.invoicemate.service;

import com.invoicemate.dto.InvoiceResponse;
import com.invoicemate.model.InvoiceItem;
import com.invoicemate.model.User;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.util.Locale;

@Service
public class PdfService {

    public byte[] generatePdf(InvoiceResponse invoice, User user) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new Color(15, 23, 42));
            Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(5, 150, 105));
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(15, 23, 42));
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(51, 65, 85));
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(100, 116, 139));

            NumberFormat currencyFmt = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));

            // 1. Top Header Banner
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{3, 2});

            // Company info (Left)
            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(Rectangle.NO_BORDER);
            String bizName = user.getBusinessName() != null && !user.getBusinessName().isBlank()
                    ? user.getBusinessName() : (user.getFullName() != null ? user.getFullName() : "InvoiceMate");
            leftCell.addElement(new Paragraph(bizName, titleFont));
            if (user.getEmail() != null) leftCell.addElement(new Paragraph("Email: " + user.getEmail(), smallFont));
            if (user.getBusinessPhone() != null && !user.getBusinessPhone().isBlank()) {
                leftCell.addElement(new Paragraph("Phone: " + user.getBusinessPhone(), smallFont));
            }
            if (user.getBusinessAddress() != null && !user.getBusinessAddress().isBlank()) {
                leftCell.addElement(new Paragraph("Address: " + user.getBusinessAddress(), smallFont));
            }
            headerTable.addCell(leftCell);

            // Invoice details (Right)
            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph invTitle = new Paragraph(invoice.isEstimate() ? "TAX ESTIMATE" : "TAX INVOICE", subTitleFont);
            invTitle.setAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(invTitle);

            Paragraph invNum = new Paragraph("#" + invoice.getInvoiceNumber(), boldFont);
            invNum.setAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(invNum);

            Paragraph invDate = new Paragraph("Date: " + invoice.getInvoiceDate(), smallFont);
            invDate.setAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(invDate);

            Paragraph dueDate = new Paragraph((invoice.isEstimate() ? "Valid Until: " : "Due Date: ") + invoice.getDueDate(), smallFont);
            dueDate.setAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(dueDate);

            headerTable.addCell(rightCell);
            document.add(headerTable);

            document.add(new Paragraph(" "));

            // 2. Bill To Box
            PdfPTable billToTable = new PdfPTable(1);
            billToTable.setWidthPercentage(100);
            PdfPCell billToCell = new PdfPCell();
            billToCell.setBackgroundColor(new Color(248, 250, 252));
            billToCell.setBorderColor(new Color(226, 232, 240));
            billToCell.setPadding(10);
            billToCell.addElement(new Paragraph("BILL TO:", boldFont));
            billToCell.addElement(new Paragraph(invoice.getCustomerName() != null ? invoice.getCustomerName() : "Valued Client", boldFont));
            if (invoice.getCustomerEmail() != null && !invoice.getCustomerEmail().isBlank()) {
                billToCell.addElement(new Paragraph(invoice.getCustomerEmail(), smallFont));
            }
            if (invoice.getCustomerPhone() != null && !invoice.getCustomerPhone().isBlank()) {
                billToCell.addElement(new Paragraph(invoice.getCustomerPhone(), smallFont));
            }
            if (invoice.getCustomerAddress() != null && !invoice.getCustomerAddress().isBlank()) {
                billToCell.addElement(new Paragraph(invoice.getCustomerAddress(), smallFont));
            }
            billToTable.addCell(billToCell);
            document.add(billToTable);

            document.add(new Paragraph(" "));

            // 3. Line Items Table
            PdfPTable itemTable = new PdfPTable(5);
            itemTable.setWidthPercentage(100);
            itemTable.setWidths(new float[]{4, 1.5f, 1.5f, 1.5f, 2});

            // Table Header
            String[] headers = {"Item Description", "HSN/SAC", "Qty", "Rate", "Amount"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(new Color(17, 24, 39));
                cell.setPadding(7);
                cell.setHorizontalAlignment(h.equals("Item Description") ? Element.ALIGN_LEFT : Element.ALIGN_RIGHT);
                itemTable.addCell(cell);
            }

            // Table Rows
            boolean alternate = false;
            if (invoice.getItems() != null) {
                for (InvoiceItem item : invoice.getItems()) {
                    Color rowBg = alternate ? new Color(248, 250, 252) : Color.WHITE;
                    alternate = !alternate;

                    PdfPCell nameCell = new PdfPCell(new Phrase(item.getName(), normalFont));
                    nameCell.setBackgroundColor(rowBg);
                    nameCell.setPadding(6);
                    itemTable.addCell(nameCell);

                    PdfPCell hsnCell = new PdfPCell(new Phrase(item.getHsnSacCode() != null ? item.getHsnSacCode() : "-", smallFont));
                    hsnCell.setBackgroundColor(rowBg);
                    hsnCell.setPadding(6);
                    hsnCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    itemTable.addCell(hsnCell);

                    PdfPCell qtyCell = new PdfPCell(new Phrase(String.valueOf(item.getQuantity()), normalFont));
                    qtyCell.setBackgroundColor(rowBg);
                    qtyCell.setPadding(6);
                    qtyCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    itemTable.addCell(qtyCell);

                    double rate = item.getPrice();
                    PdfPCell rateCell = new PdfPCell(new Phrase(String.format("%.2f", rate), normalFont));
                    rateCell.setBackgroundColor(rowBg);
                    rateCell.setPadding(6);
                    rateCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    itemTable.addCell(rateCell);

                    double total = item.getTotal();
                    PdfPCell totalCell = new PdfPCell(new Phrase(String.format("%.2f", total), boldFont));
                    totalCell.setBackgroundColor(rowBg);
                    totalCell.setPadding(6);
                    totalCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    itemTable.addCell(totalCell);
                }
            }
            document.add(itemTable);

            document.add(new Paragraph(" "));

            // 4. Totals Summary Table
            PdfPTable totalTable = new PdfPTable(2);
            totalTable.setWidthPercentage(45);
            totalTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalTable.setWidths(new float[]{2, 2});

            addSummaryRow(totalTable, "Subtotal:", String.format("%.2f", invoice.getSubtotal()), normalFont, false);
            if (invoice.getDiscountAmount() > 0) {
                addSummaryRow(totalTable, "Discount:", "-" + String.format("%.2f", invoice.getDiscountAmount()), normalFont, false);
            }
            if (invoice.getGstAmount() > 0) {
                addSummaryRow(totalTable, "GST (" + invoice.getGstPercent() + "%):", String.format("%.2f", invoice.getGstAmount()), normalFont, false);
            }
            addSummaryRow(totalTable, "Grand Total:", currencyFmt.format(invoice.getGrandTotal()), boldFont, true);

            document.add(totalTable);

            // 5. Payment details & UPI info
            if (user.getUpiId() != null && !user.getUpiId().isBlank()) {
                document.add(new Paragraph(" "));
                PdfPTable upiTable = new PdfPTable(1);
                upiTable.setWidthPercentage(100);
                PdfPCell upiCell = new PdfPCell();
                upiCell.setBackgroundColor(new Color(240, 253, 244));
                upiCell.setBorderColor(new Color(187, 247, 208));
                upiCell.setPadding(8);
                Paragraph upiPara = new Paragraph("PAY VIA UPI: " + user.getUpiId() + " (Scan & Pay with GPay / PhonePe / Paytm)", boldFont);
                upiPara.getFont().setColor(new Color(21, 128, 61));
                upiCell.addElement(upiPara);
                upiTable.addCell(upiCell);
                document.add(upiTable);
            }

            // 6. Notes & Footer
            if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
                document.add(new Paragraph(" "));
                document.add(new Paragraph("Notes / Terms:", boldFont));
                document.add(new Paragraph(invoice.getNotes(), smallFont));
            }

            Paragraph footer = new Paragraph("\nThank you for your business! Generated with InvoiceMate.", smallFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private void addSummaryRow(PdfPTable table, String label, String value, Font font, boolean isTotal) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, font));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPadding(4);
        if (isTotal) labelCell.setBackgroundColor(new Color(220, 252, 231));

        PdfPCell valCell = new PdfPCell(new Phrase(value, font));
        valCell.setBorder(Rectangle.NO_BORDER);
        valCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        valCell.setPadding(4);
        if (isTotal) valCell.setBackgroundColor(new Color(220, 252, 231));

        table.addCell(labelCell);
        table.addCell(valCell);
    }
}
