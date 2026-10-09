package com.invoicemate.controller;

import com.invoicemate.dto.ReportResponse;
import com.invoicemate.service.ReportService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public ReportResponse getReport(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String status) {
        return reportService.getReport(getUserId(), from, to, customerId, status);
    }

    @GetMapping("/top-customers")
    public List<Map<String, Object>> getTopCustomers(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return reportService.getTopCustomers(getUserId(), from, to);
    }

    @GetMapping("/gst-quarterly")
    public com.invoicemate.dto.GstQuarterlyResponse getGstQuarterly(
            @RequestParam(required = false) String periodType,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String quarter,
            @RequestParam(required = false) Integer month) {
        return reportService.getGstReport(getUserId(), periodType, year, quarter, month);
    }

    @GetMapping("/gst-report")
    public com.invoicemate.dto.GstQuarterlyResponse getGstReport(
            @RequestParam(required = false) String periodType,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String quarter,
            @RequestParam(required = false) Integer month) {
        return reportService.getGstReport(getUserId(), periodType, year, quarter, month);
    }
}
