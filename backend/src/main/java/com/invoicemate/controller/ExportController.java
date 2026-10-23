package com.invoicemate.controller;

import com.invoicemate.service.ExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping("/invoices/csv")
    public ResponseEntity<byte[]> exportInvoicesCsv() {
        String csv = exportService.exportInvoicesCsv(getUserId());
        byte[] data = csv.getBytes(StandardCharsets.UTF_8);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDispositionFormData("filename", "invoices_export_" + LocalDate.now() + ".csv");
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @GetMapping("/customers/csv")
    public ResponseEntity<byte[]> exportCustomersCsv() {
        String csv = exportService.exportCustomersCsv(getUserId());
        byte[] data = csv.getBytes(StandardCharsets.UTF_8);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDispositionFormData("filename", "customers_export_" + LocalDate.now() + ".csv");
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @GetMapping("/backup/json")
    public ResponseEntity<byte[]> exportBackupJson() throws Exception {
        byte[] json = exportService.exportFullBackupJson(getUserId());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setContentDispositionFormData("filename", "invoicemate_backup_" + LocalDate.now() + ".json");
        return ResponseEntity.ok().headers(headers).body(json);
    }
}
