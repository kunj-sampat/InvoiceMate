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
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("configured", grokAiService.isGrokConfigured());
        status.put("keyPrefix", grokAiService.getKeyPrefix());
        status.put("model", grokAiService.getEffectiveModel());
        status.put("provider", grokAiService.getProviderName());
        status.put("lastError", grokAiService.getLastError());
        return status;
    }

    @PostMapping("/test")
    public Map<String, Object> testAiConnection() {
        return grokAiService.testConnection();
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

    /**
     * POST /api/ai/payment-risk
     * Body: { "customerId": 5, "customerName": "Acme Corp" }
     * Fetches all invoice history for that customer and runs AI risk analysis.
     */
    @PostMapping("/payment-risk")
    public Map<String, Object> analyzePaymentRisk(@RequestBody Map<String, Object> payload) {
        Long userId = getUserId();
        Object customerIdObj = payload.get("customerId");
        if (customerIdObj == null) {
            return Map.of("error", "customerId is required");
        }
        Long customerId = Long.parseLong(customerIdObj.toString());
        String customerName = payload.getOrDefault("customerName", "Client").toString();

        java.util.List<com.invoicemate.model.Invoice> rawInvoices =
            invoiceService.getInvoicesByCustomer(userId, customerId);

        java.util.List<Map<String, Object>> historyList = new java.util.ArrayList<>();
        java.time.LocalDate today = java.time.LocalDate.now();

        for (com.invoicemate.model.Invoice inv : rawInvoices) {
            if (inv.isDraft() || inv.isEstimate()) continue;
            Map<String, Object> entry = new java.util.LinkedHashMap<>();
            entry.put("invoiceNumber", inv.getInvoiceNumber());
            entry.put("status", inv.getStatus());
            entry.put("grandTotal", inv.getGrandTotal());
            entry.put("amountPaid", inv.getAmountPaid());
            entry.put("dueDate", inv.getDueDate() != null ? inv.getDueDate().toString() : null);
            entry.put("invoiceDate", inv.getInvoiceDate() != null ? inv.getInvoiceDate().toString() : null);
            if (inv.getDueDate() != null && "OVERDUE".equals(inv.getStatus())) {
                long daysLate = java.time.temporal.ChronoUnit.DAYS.between(inv.getDueDate(), today);
                entry.put("daysLate", Math.max(0, daysLate));
            } else {
                entry.put("daysLate", 0);
            }
            historyList.add(entry);
        }

        return grokAiService.analyzePaymentRisk(customerName, historyList);
    }

    /**
     * POST /api/ai/terms-generator
     * Body: { "businessName": "Acme", "clientType": "Corporate", "serviceType": "Software Development",
     *         "paymentTermsDays": "30", "includeLateFee": true }
     */
    @PostMapping("/terms-generator")
    public Map<String, Object> generateTermsAndNotes(@RequestBody Map<String, Object> payload) {
        String businessName = payload.getOrDefault("businessName", "Your Business").toString();
        String clientType = payload.getOrDefault("clientType", "Individual").toString();
        String serviceType = payload.getOrDefault("serviceType", "Professional Services").toString();
        String paymentTermsDays = payload.getOrDefault("paymentTermsDays", "30").toString();
        boolean includeLateFee = Boolean.parseBoolean(payload.getOrDefault("includeLateFee", "true").toString());

        return grokAiService.generateTermsAndNotes(businessName, clientType, serviceType, paymentTermsDays, includeLateFee);
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
