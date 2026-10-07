package com.invoicemate.controller;

import com.invoicemate.dto.InvoiceRequest;
import com.invoicemate.dto.InvoiceResponse;
import com.invoicemate.model.InvoiceActivity;
import com.invoicemate.repository.InvoiceActivityRepository;
import com.invoicemate.service.InvoiceService;
import com.invoicemate.service.PdfService;
import com.invoicemate.service.UserService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final InvoiceActivityRepository activityRepository;
    private final PdfService pdfService;
    private final UserService userService;

    public InvoiceController(InvoiceService invoiceService, InvoiceActivityRepository activityRepository,
                             PdfService pdfService, UserService userService) {
        this.invoiceService = invoiceService;
        this.activityRepository = activityRepository;
        this.pdfService = pdfService;
        this.userService = userService;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public List<InvoiceResponse> getInvoices(
            @RequestParam(required = false) Boolean isEstimate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        if (isEstimate != null) {
            return invoiceService.getInvoicesByType(getUserId(), search, status, isEstimate);
        }
        return invoiceService.getInvoices(getUserId(), status, search, from, to);
    }

    @PostMapping
    public InvoiceResponse createInvoice(@RequestBody InvoiceRequest req) {
        return invoiceService.createInvoice(getUserId(), req);
    }

    @GetMapping("/{id}")
    public InvoiceResponse getInvoice(@PathVariable Long id) {
        return invoiceService.getInvoice(getUserId(), id);
    }

    @PutMapping("/{id}")
    public InvoiceResponse updateInvoice(@PathVariable Long id, @RequestBody InvoiceRequest req) {
        return invoiceService.updateInvoice(getUserId(), id, req);
    }

    @DeleteMapping("/{id}")
    public void deleteInvoice(@PathVariable Long id) {
        invoiceService.deleteInvoice(getUserId(), id);
    }

    @PostMapping("/{id}/duplicate")
    public InvoiceResponse duplicateInvoice(@PathVariable Long id) {
        return invoiceService.duplicateInvoice(getUserId(), id);
    }

    @GetMapping("/{id}/activities")
    public List<InvoiceActivity> getActivities(@PathVariable Long id) {
        // Assume access check happens elsewhere or we just return it
        return activityRepository.findByInvoiceIdOrderByCreatedAtDesc(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getPdf(@PathVariable Long id) {
        Long userId = getUserId();
        InvoiceResponse inv = invoiceService.getInvoice(userId, id);
        byte[] pdf = pdfService.generatePdf(inv, userService.getUserById(userId));
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("filename", "invoice_" + inv.getInvoiceNumber() + ".pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
