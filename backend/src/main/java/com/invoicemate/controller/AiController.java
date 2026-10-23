package com.invoicemate.controller;

import com.invoicemate.dto.DashboardResponse;
import com.invoicemate.dto.InvoiceResponse;
import com.invoicemate.repository.ExpenseRepository;
import com.invoicemate.service.DashboardService;
import com.invoicemate.service.GrokAiService;
import com.invoicemate.service.InvoiceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final GrokAiService grokAiService;
    private final InvoiceService invoiceService;
    private final DashboardService dashboardService;
    private final ExpenseRepository expenseRepository;

    public AiController(GrokAiService grokAiService,
                        InvoiceService invoiceService,
                        DashboardService dashboardService,
                        ExpenseRepository expenseRepository) {
        this.grokAiService = grokAiService;
        this.invoiceService = invoiceService;
        this.dashboardService = dashboardService;
        this.expenseRepository = expenseRepository;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping("/status")
    public Map<String, Object> getAiStatus() {
        return Map.of(
            "configured", grokAiService.isGrokConfigured(),
            "model", "grok-2-latest",
            "provider", "xAI (Grok)"
        );
    }

    @PostMapping("/parse-invoice")
    public Map<String, Object> parseInvoice(@RequestBody Map<String, String> payload) {
        String prompt = payload.get("prompt");
        if (prompt == null || prompt.trim().isEmpty()) {
            return Map.of("error", "Prompt cannot be empty");
        }
        return grokAiService.parseInvoicePrompt(prompt);
    }

    @PostMapping("/payment-reminders")
    public Map<String, Object> generatePaymentReminders(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        Object invIdObj = payload.get("invoiceId");
        if (invIdObj == null) {
            return Map.of("error", "invoiceId is required");
        }
        Long invoiceId = Long.parseLong(invIdObj.toString());
        InvoiceResponse invoice = invoiceService.getInvoice(getUserId(), invoiceId);

        String baseUrl = getBaseUrl(request);
        String publicToken = invoice.getShareToken() != null ? invoice.getShareToken() : String.valueOf(invoice.getId());
        String publicUrl = baseUrl + "/pay.html?token=" + publicToken;

        return grokAiService.generatePaymentReminders(invoice, publicUrl);
    }

    @GetMapping("/business-insights")
    public Map<String, Object> getBusinessInsights() {
        Long userId = getUserId();
        DashboardResponse stats = dashboardService.getSummary(userId);
        Double totalExpenses = expenseRepository.sumAmountByUserId(userId);

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("totalRevenue", stats.getTotalRevenue());
        metrics.put("totalCollected", stats.getTotalPaid());
        metrics.put("overdueAmount", stats.getTotalOutstanding());
        metrics.put("totalInvoices", stats.getTotalInvoices());
        metrics.put("paidInvoices", stats.getPaidCount());
        metrics.put("pendingInvoices", stats.getPendingCount());
        metrics.put("overdueInvoices", stats.getOverdueCount());
        metrics.put("totalExpenses", totalExpenses != null ? totalExpenses : 0.0);

        return grokAiService.generateBusinessInsights(metrics);
    }

    private String getBaseUrl(HttpServletRequest req) {
        String scheme = req.getScheme();
        String serverName = req.getServerName();
        int serverPort = req.getServerPort();
        if ((scheme.equals("http") && serverPort == 80) || (scheme.equals("https") && serverPort == 443)) {
            return scheme + "://" + serverName;
        }
        return scheme + "://" + serverName + ":" + serverPort;
    }
}
