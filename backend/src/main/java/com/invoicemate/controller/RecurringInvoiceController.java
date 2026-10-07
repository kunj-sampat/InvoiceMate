package com.invoicemate.controller;

import com.invoicemate.dto.InvoiceResponse;
import com.invoicemate.dto.RecurringInvoiceRequest;
import com.invoicemate.dto.RecurringInvoiceResponse;
import com.invoicemate.service.RecurringInvoiceService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recurring")
public class RecurringInvoiceController {

    private final RecurringInvoiceService recurringService;

    public RecurringInvoiceController(RecurringInvoiceService recurringService) {
        this.recurringService = recurringService;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public List<RecurringInvoiceResponse> getRecurringInvoices() {
        return recurringService.getRecurringInvoices(getUserId());
    }

    @GetMapping("/{id}")
    public RecurringInvoiceResponse getRecurringInvoice(@PathVariable Long id) {
        return recurringService.getRecurringInvoice(getUserId(), id);
    }

    @PostMapping
    public RecurringInvoiceResponse createRecurringInvoice(@RequestBody RecurringInvoiceRequest req) {
        return recurringService.createRecurringInvoice(getUserId(), req);
    }

    @PatchMapping("/{id}/toggle")
    public RecurringInvoiceResponse toggleStatus(@PathVariable Long id) {
        return recurringService.toggleStatus(getUserId(), id);
    }

    @PostMapping("/{id}/generate")
    public InvoiceResponse generateNow(@PathVariable Long id) {
        return recurringService.generateNow(getUserId(), id);
    }

    @DeleteMapping("/{id}")
    public void deleteRecurringInvoice(@PathVariable Long id) {
        recurringService.deleteRecurringInvoice(getUserId(), id);
    }
}
