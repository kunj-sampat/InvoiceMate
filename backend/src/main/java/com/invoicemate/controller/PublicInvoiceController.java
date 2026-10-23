package com.invoicemate.controller;

import com.invoicemate.dto.InvoiceResponse;
import com.invoicemate.model.Invoice;
import com.invoicemate.model.User;
import com.invoicemate.service.InvoiceService;
import com.invoicemate.service.PdfService;
import com.invoicemate.service.UserService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/invoices")
public class PublicInvoiceController {

    private final InvoiceService invoiceService;
    private final PdfService pdfService;
    private final UserService userService;

    public PublicInvoiceController(InvoiceService invoiceService, PdfService pdfService, UserService userService) {
        this.invoiceService = invoiceService;
        this.pdfService = pdfService;
        this.userService = userService;
    }

    @GetMapping("/{token}")
    public InvoiceResponse getPublicInvoice(@PathVariable String token) {
        return invoiceService.getPublicInvoiceByToken(token);
    }

    @GetMapping("/{token}/pdf")
    public ResponseEntity<byte[]> getPublicInvoicePdf(@PathVariable String token) {
        InvoiceResponse inv = invoiceService.getPublicInvoiceByToken(token);
        Invoice entity = invoiceService.getInvoiceEntityByToken(token);
        User user = userService.getUserById(entity.getUserId());

        byte[] pdf = pdfService.generatePdf(inv, user);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("filename", "invoice_" + inv.getInvoiceNumber() + ".pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
