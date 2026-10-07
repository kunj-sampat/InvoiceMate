package com.invoicemate.service;

import com.invoicemate.dto.InvoiceResponse;
import com.invoicemate.model.InvoiceItem;
import com.invoicemate.model.User;
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

@Service
public class PdfService {

    public byte[] generatePdf(InvoiceResponse invoice, User user) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();
            
            document.add(new Paragraph("INVOICE"));
            document.add(new Paragraph("From: " + user.getBusinessName()));
            document.add(new Paragraph("To: " + invoice.getCustomerName()));
            document.add(new Paragraph("Invoice Number: " + invoice.getInvoiceNumber()));
            document.add(new Paragraph("Date: " + invoice.getInvoiceDate()));
            document.add(new Paragraph("Due Date: " + invoice.getDueDate()));
            document.add(new Paragraph("\nItems:"));
            
            for (InvoiceItem item : invoice.getItems()) {
                document.add(new Paragraph(item.getName() + " x " + item.getQuantity() + " = " + item.getTotal()));
            }
            
            document.add(new Paragraph("\nSubtotal: " + invoice.getSubtotal()));
            document.add(new Paragraph("Discount: " + invoice.getDiscountAmount()));
            document.add(new Paragraph("GST: " + invoice.getGstAmount()));
            document.add(new Paragraph("Grand Total: " + invoice.getGrandTotal()));
            
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }
}
