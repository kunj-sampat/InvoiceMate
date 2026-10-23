package com.invoicemate.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.invoicemate.dto.InvoiceResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GrokAiService {

    private static final Logger log = LoggerFactory.getLogger(GrokAiService.class);

    @Value("${grok.api.key:${GROK_API_KEY:${XAI_API_KEY:}}}")
    private String grokApiKey;

    @Value("${grok.api.url:${GROK_API_URL:https://api.x.ai/v1/chat/completions}}")
    private String grokApiUrl;

    @Value("${grok.model:${GROK_MODEL:grok-2-latest}}")
    private String grokModel;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private volatile String lastError;

    public boolean isGrokConfigured() {
        return grokApiKey != null && !grokApiKey.trim().isEmpty() && !grokApiKey.contains("your_");
    }

    public String getLastError() {
        return lastError;
    }

    public String getKeyPrefix() {
        if (!isGrokConfigured()) return "none";
        String k = grokApiKey.trim();
        int idx = k.indexOf('_');
        if (idx > 0 && idx < 8) return k.substring(0, idx + 1);
        if (k.startsWith("xai-")) return "xai-";
        if (k.startsWith("sk-")) return "sk-";
        return k.length() > 6 ? k.substring(0, 6) + "..." : k;
    }

    public String getEffectiveModel() {
        String key = grokApiKey != null ? grokApiKey.trim() : "";
        if (grokApiUrl.contains("api.x.ai")) {
            if (key.startsWith("gsk_")) return "llama-3.3-70b-versatile";
            if (key.startsWith("sk-")) return "gpt-4o-mini";
        }
        return grokModel;
    }

    public String getProviderName() {
        String key = grokApiKey != null ? grokApiKey.trim() : "";
        if (grokApiUrl.contains("api.x.ai")) {
            if (key.startsWith("gsk_")) return "Groq Cloud (Llama 3.3)";
            if (key.startsWith("sk-")) return "OpenAI";
            return "xAI (Grok)";
        }
        return "Custom (" + grokApiUrl + ")";
    }

    public Map<String, Object> testConnection() {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!isGrokConfigured()) {
            res.put("success", false);
            res.put("error", "No API key configured in .env. Please add GROK_API_KEY.");
            return res;
        }
        try {
            String testReply = callGrok("You are a system health probe.", "Ping. Reply strictly with the word PONG.");
            if (testReply != null && !testReply.isBlank()) {
                res.put("success", true);
                res.put("message", "Live AI verified! Received response: " + testReply.trim());
                res.put("model", getEffectiveModel());
                res.put("provider", getProviderName());
                return res;
            } else {
                res.put("success", false);
                res.put("error", lastError != null ? lastError : "Empty response from AI endpoint");
                res.put("provider", getProviderName());
                return res;
            }
        } catch (Exception e) {
            res.put("success", false);
            res.put("error", e.getMessage());
            res.put("provider", getProviderName());
            return res;
        }
    }

    /**
     * Parses freeform user text/email/notes into structured invoice data using Grok AI.
     */
    public Map<String, Object> parseInvoicePrompt(String prompt) {
        if (isGrokConfigured()) {
            try {
                String systemPrompt = """
                    You are an expert AI invoicing assistant for InvoiceMate.
                    Analyze the user's raw prompt/message and extract invoice details into pure JSON.
                    Respond ONLY with a valid JSON object without markdown fences, matching this structure:
                    {
                      "customerName": "Client or Company name",
                      "customerEmail": "email if mentioned else empty",
                      "customerPhone": "phone if mentioned else empty",
                      "dueDays": 15,
                      "discountPercent": 0.0,
                      "gstPercent": 18.0,
                      "notes": "Any terms, project info, or thank you note",
                      "items": [
                        {
                          "name": "Item or service description",
                          "quantity": 1.0,
                          "price": 5000.0,
                          "hsnSacCode": "998311"
                        }
                      ]
                    }
                    Ensure items have realistic quantities and prices extracted from the prompt.
                    """;

                String aiResult = callGrok(systemPrompt, prompt);
                if (aiResult != null && !aiResult.isBlank()) {
                    String cleanJson = cleanJsonResponse(aiResult);
                    Map<String, Object> res = objectMapper.readValue(cleanJson, Map.class);
                    res.put("aiModel", getEffectiveModel());
                    res.put("isLiveAi", true);
                    res.put("source", "Live " + getProviderName());
                    return res;
                }
            } catch (Exception e) {
                log.warn("Grok AI API call failed or timed out: {}", e.getMessage());
            }
        }

        // Smart Heuristic Fallback
        Map<String, Object> fallback = fallbackParsePrompt(prompt);
        fallback.put("isLiveAi", false);
        fallback.put("aiModel", "InvoiceMate Smart Copilot (Offline Heuristic)");
        if (lastError != null) {
            fallback.put("apiWarning", lastError);
        }
        return fallback;
    }

    /**
     * Generates 3 contextual, high-converting payment reminders for an invoice.
     */
    public Map<String, Object> generatePaymentReminders(InvoiceResponse invoice, String publicUrl) {
        String clientName = (invoice.getCustomerName() != null && !invoice.getCustomerName().isBlank())
                ? invoice.getCustomerName() : "Valued Client";
        String businessName = (invoice.getBusinessName() != null && !invoice.getBusinessName().isBlank())
                ? invoice.getBusinessName() : "InvoiceMate Merchant";
        String invNumber = invoice.getInvoiceNumber();
        double remaining = Math.max(0, invoice.getGrandTotal() - invoice.getAmountPaid());
        String amountFormatted = String.format(Locale.US, "₹%,.2f", remaining);
        String dueDateStr = invoice.getDueDate() != null ? invoice.getDueDate().toString() : "Due Date";

        if (isGrokConfigured()) {
            try {
                String systemPrompt = String.format("""
                    You are an expert business communicator. Write 3 distinct payment reminder messages for a client.
                    Context:
                    - Client: %s
                    - Business: %s
                    - Invoice #: %s
                    - Amount Due: %s
                    - Due Date: %s
                    - Payment Link: %s

                    Respond ONLY with valid JSON (no markdown):
                    {
                      "friendly": "Friendly & polite reminder (for upcoming or 1-3 days past due)",
                      "firm": "Professional, clear and direct reminder (for 5-15 days overdue)",
                      "urgent": "Urgent, formal final notice (for 15+ days overdue, professional but firm)"
                    }
                    Include the invoice number, amount, and the exact payment link in all messages.
                    """, clientName, businessName, invNumber, amountFormatted, dueDateStr, publicUrl);

                String aiResult = callGrok(systemPrompt, "Generate 3 high-converting WhatsApp/Email payment reminders.");
                if (aiResult != null && !aiResult.isBlank()) {
                    String cleanJson = cleanJsonResponse(aiResult);
                    Map<String, Object> result = objectMapper.readValue(cleanJson, Map.class);
                    result.put("source", "Grok 2.0 (xAI)");
                    return result;
                }
            } catch (Exception e) {
                log.warn("Grok reminder generation failed, using intelligent template engine: {}", e.getMessage());
            }
        }

        // Built-in intelligent template fallback
        Map<String, Object> reminders = new LinkedHashMap<>();
        reminders.put("source", "InvoiceMate Smart Engine");
        reminders.put("friendly", String.format(
            "Hi %s! 👋 Hope you're having a productive week. Just a gentle reminder regarding Invoice #%s for %s, scheduled for %s. You can review and complete the payment directly with zero fees via UPI/Card here: %s\n\nThank you for working with %s!",
            clientName, invNumber, amountFormatted, dueDateStr, publicUrl, businessName
        ));

        reminders.put("firm", String.format(
            "Dear %s,\n\nThis is a friendly reminder that Invoice #%s for %s was due on %s and remains pending. Please take a moment to clear the balance using our instant scan-to-pay link: %s\n\nIf you have already processed the payment, kindly ignore this message. Best regards,\n%s",
            clientName, invNumber, amountFormatted, dueDateStr, publicUrl, businessName
        ));

        reminders.put("urgent", String.format(
            "URGENT: Outstanding Balance for Invoice #%s\n\nAttention %s,\nYour payment of %s for Invoice #%s is now significantly overdue (Due: %s). Please settle this balance immediately to keep your account in good standing.\n\nDirect Pay Link: %s\n\nThank you,\n%s Accounts Team",
            invNumber, clientName, amountFormatted, invNumber, dueDateStr, publicUrl, businessName
        ));

        return reminders;
    }

    /**
     * Generates executive AI financial insights and business recommendations.
     */
    public Map<String, Object> generateBusinessInsights(Map<String, Object> stats) {
        if (isGrokConfigured()) {
            try {
                String statsJson = objectMapper.writeValueAsString(stats);
                String systemPrompt = """
                    You are a top-tier Chief Financial Officer (CFO) and business advisor for Indian freelancers and SMEs.
                    Analyze the user's business financial metrics and return executive insights in pure JSON:
                    {
                      "healthScore": "92/100",
                      "healthStatus": "Excellent | Stable | Needs Attention",
                      "summary": "1-2 sentence executive summary of current business health",
                      "actionItems": [
                        "Actionable tip 1 to collect pending invoices or boost margin",
                        "Actionable tip 2 to optimize expenses",
                        "Strategic projection or pricing advice"
                      ]
                    }
                    """;

                String aiResult = callGrok(systemPrompt, statsJson);
                if (aiResult != null && !aiResult.isBlank()) {
                    String cleanJson = cleanJsonResponse(aiResult);
                    Map<String, Object> res = objectMapper.readValue(cleanJson, Map.class);
                    res.put("aiModel", grokModel);
                    return res;
                }
            } catch (Exception e) {
                log.warn("Grok insights call failed, falling back to rule-based financial analysis: {}", e.getMessage());
            }
        }

        // Smart Heuristic Financial Insights
        double totalBilled = getDouble(stats, "totalRevenue", 0.0);
        double collected = getDouble(stats, "totalCollected", 0.0);
        double expenses = getDouble(stats, "totalExpenses", 0.0);
        double netProfit = collected - expenses;
        double overdue = getDouble(stats, "overdueAmount", 0.0);

        int score = 85;
        String status = "Stable";
        if (netProfit > 50000 && overdue < 10000) {
            score = 94;
            status = "Excellent";
        } else if (overdue > collected * 0.4) {
            score = 68;
            status = "Needs Attention";
        }

        Map<String, Object> fallback = new LinkedHashMap<>();
        fallback.put("healthScore", score + "/100");
        fallback.put("healthStatus", status);
        fallback.put("summary", String.format(
            "Your business has generated ₹%,.2f in collected revenue with a net profit of ₹%,.2f. %s",
            collected, netProfit, (overdue > 0 ? "You have ₹" + String.format("%.2f", overdue) + " in overdue client dues requiring immediate follow-up." : "Your receivables are completely up-to-date!")
        ));

        List<String> actions = new ArrayList<>();
        if (overdue > 0) {
            actions.add("Dispatch automated WhatsApp payment reminders with dynamic UPI QR codes to recover ₹" + String.format("%.2f", overdue) + " in pending dues.");
        } else {
            actions.add("Your cashflow collection cycle is outstanding. Consider introducing quarterly retainers to lock in predictable recurring revenue.");
        }
        if (expenses > 0 && collected > 0 && (expenses / collected) > 0.4) {
            actions.add("Operating expenses exceed 40% of collected revenue. Review vendor subscriptions and recurring overhead to widen profit margins.");
        } else {
            actions.add("Healthy operational expense ratio maintained below 35%. Reinvest surplus cashflow into high-return client acquisition.");
        }
        actions.add("Prepare quarterly GST filing reports early to ensure smooth input tax credit (ITC) reconciliation.");

        fallback.put("actionItems", actions);
        fallback.put("aiModel", "InvoiceMate Intelligence Heuristic");
        return fallback;
    }

    /**
     * Analyzes a customer's invoice payment history and returns a late-payment risk score.
     */
    public Map<String, Object> analyzePaymentRisk(String customerName, List<Map<String, Object>> invoiceHistory) {
        if (isGrokConfigured()) {
            try {
                String historyJson = objectMapper.writeValueAsString(invoiceHistory);
                String systemPrompt = """
                    You are an expert credit risk analyst specializing in Indian SME invoicing.
                    Analyze the customer's invoice payment history and return a JSON risk assessment:
                    {
                      "riskScore": 72,
                      "riskLevel": "MEDIUM",
                      "riskColor": "#f59e0b",
                      "summary": "One-sentence plain English summary",
                      "recommendation": "Specific action to take (e.g., ask for advance, send reminder, etc.)",
                      "insights": [
                        "Specific insight about payment behavior 1",
                        "Specific insight about payment behavior 2",
                        "Specific insight about payment behavior 3"
                      ],
                      "avgDaysToPayAfterDue": 5,
                      "onTimePaymentRate": "67%"
                    }
                    riskScore: 0-100 (0=perfect, 100=very high risk).
                    riskLevel: LOW (<30), MEDIUM (30-70), HIGH (>70).
                    riskColor: green (#10b981) for LOW, amber (#f59e0b) for MEDIUM, red (#ef4444) for HIGH.
                    Base your analysis on: overdue count, payment delays, partial payments, unpaid invoices.
                    """;

                String aiResult = callGrok(systemPrompt,
                    "Customer: " + customerName + "\nInvoice history (JSON):\n" + historyJson);
                if (aiResult != null && !aiResult.isBlank()) {
                    String cleanJson = cleanJsonResponse(aiResult);
                    Map<String, Object> res = objectMapper.readValue(cleanJson, Map.class);
                    res.put("customerName", customerName);
                    res.put("aiModel", grokModel);
                    return res;
                }
            } catch (Exception e) {
                log.warn("Grok risk analysis failed, using heuristic engine: {}", e.getMessage());
            }
        }

        // Smart heuristic fallback
        return heuristicPaymentRisk(customerName, invoiceHistory);
    }

    private Map<String, Object> heuristicPaymentRisk(String customerName, List<Map<String, Object>> history) {
        if (history == null || history.isEmpty()) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("customerName", customerName);
            r.put("riskScore", 50);
            r.put("riskLevel", "MEDIUM");
            r.put("riskColor", "#f59e0b");
            r.put("summary", "No invoice history found — risk cannot be determined yet.");
            r.put("recommendation", "Send a small invoice first to gauge payment reliability before extending large credit.");
            r.put("insights", List.of(
                "No prior transactions found with this customer.",
                "Consider starting with 50% advance payment for new clients.",
                "Build payment history over 2-3 invoices before extending credit terms."
            ));
            r.put("avgDaysToPayAfterDue", 0);
            r.put("onTimePaymentRate", "N/A");
            r.put("aiModel", "InvoiceMate Heuristic Engine");
            return r;
        }

        int totalInvoices = history.size();
        int overdueCount = 0, paidLateCount = 0, unpaidCount = 0;
        double totalBilled = 0, totalPaid = 0;
        long totalDaysLate = 0;

        for (Map<String, Object> inv : history) {
            String status = String.valueOf(inv.getOrDefault("status", ""));
            double billed = getDouble(inv, "grandTotal", 0);
            double paid = getDouble(inv, "amountPaid", 0);
            totalBilled += billed;
            totalPaid += paid;

            if ("OVERDUE".equals(status)) overdueCount++;
            if ("PENDING".equals(status) || (billed > paid && !"PAID".equals(status))) unpaidCount++;

            Object daysLateObj = inv.get("daysLate");
            if (daysLateObj != null) {
                try {
                    long dl = Long.parseLong(daysLateObj.toString());
                    if (dl > 0) { paidLateCount++; totalDaysLate += dl; }
                } catch (Exception ignored) {}
            }
        }

        double collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) : 0;
        double overdueRate = totalInvoices > 0 ? ((double) overdueCount / totalInvoices) : 0;
        long avgDaysLate = paidLateCount > 0 ? (totalDaysLate / paidLateCount) : 0;
        int onTimeCount = totalInvoices - paidLateCount - overdueCount;
        String onTimeRate = totalInvoices > 0 ? (onTimeCount * 100 / totalInvoices) + "%" : "N/A";

        int score = 20;
        score += (int) (overdueRate * 50);
        score += (int) (avgDaysLate * 1.5);
        score += unpaidCount * 5;
        if (collectionRate < 0.5) score += 20;
        score = Math.min(score, 100);

        String level, color;
        if (score < 30) { level = "LOW"; color = "#10b981"; }
        else if (score < 70) { level = "MEDIUM"; color = "#f59e0b"; }
        else { level = "HIGH"; color = "#ef4444"; }

        List<String> insights = new ArrayList<>();
        insights.add(String.format("Payment collection rate: %.0f%% of total billed amount received.", collectionRate * 100));
        if (overdueCount > 0)
            insights.add(overdueCount + " overdue invoice(s) found — this client has a pattern of delayed payments.");
        else
            insights.add("No currently overdue invoices — good payment discipline observed.");
        if (avgDaysLate > 0)
            insights.add(String.format("Average payment delay: %d days after the due date.", avgDaysLate));
        else
            insights.add("Payments are generally made on time based on available history.");

        String recommendation;
        if (score >= 70)
            recommendation = "Request 50% advance payment upfront before starting work. Add late fee clause to invoice terms.";
        else if (score >= 30)
            recommendation = "Send a payment reminder 3 days before the due date. Offer a small discount for early payment.";
        else
            recommendation = "Low-risk client. You can comfortably extend standard net-30 payment terms.";

        String summary = String.format("%s has a %s payment risk profile with a score of %d/100 based on %d invoice(s).",
                customerName, level.toLowerCase(), score, totalInvoices);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("customerName", customerName);
        result.put("riskScore", score);
        result.put("riskLevel", level);
        result.put("riskColor", color);
        result.put("summary", summary);
        result.put("recommendation", recommendation);
        result.put("insights", insights);
        result.put("avgDaysToPayAfterDue", avgDaysLate);
        result.put("onTimePaymentRate", onTimeRate);
        result.put("aiModel", "InvoiceMate Heuristic Engine");
        return result;
    }

    /**
     * Generates AI-crafted professional invoice terms, payment clauses, and thank-you notes.
     */
    public Map<String, Object> generateTermsAndNotes(String businessName, String clientType,
                                                      String serviceType, String paymentTermsDays,
                                                      boolean includeLateFee) {
        if (isGrokConfigured()) {
            try {
                String systemPrompt = String.format("""
                    You are a professional business legal and communications expert for Indian SMEs and freelancers.
                    Generate polished, professional invoice content for:
                    - Business: %s
                    - Client Type: %s (e.g. Corporate, Startup, Individual, Government)
                    - Service Type: %s (e.g. Software Development, Design, Consulting, etc.)
                    - Payment Terms: Net %s days
                    - Include Late Fee Clause: %s
                    
                    Respond ONLY with valid JSON (no markdown):
                    {
                      "paymentTerms": "Concise, professional payment terms clause (2-3 sentences)",
                      "lateFeeClause": "Late payment interest clause (or empty string if not requested)",
                      "thankYouNote": "Warm, professional thank-you note for the invoice footer (1-2 sentences)",
                      "invoiceNotes": "General invoice notes/terms (2-3 bullet points as single string with line breaks)",
                      "warrantyClause": "Short warranty or liability disclaimer relevant to the service type"
                    }
                    Keep language professional yet warm, suitable for Indian business context.
                    """, businessName, clientType, serviceType, paymentTermsDays, includeLateFee ? "Yes" : "No");

                String aiResult = callGrok(systemPrompt,
                    "Generate professional invoice terms and notes for " + businessName + ".");
                if (aiResult != null && !aiResult.isBlank()) {
                    String cleanJson = cleanJsonResponse(aiResult);
                    Map<String, Object> res = objectMapper.readValue(cleanJson, Map.class);
                    res.put("aiModel", grokModel);
                    return res;
                }
            } catch (Exception e) {
                log.warn("Grok terms generation failed, using built-in templates: {}", e.getMessage());
            }
        }

        // Built-in professional template fallback
        String terms = String.format(
            "Payment is due within %s days from the date of invoice. Please make payment via UPI, NEFT, or cheque in favour of %s.",
            paymentTermsDays, businessName);

        String lateFee = includeLateFee
            ? "Interest at the rate of 18% per annum (1.5% per month) will be charged on all overdue balances after the due date."
            : "";

        String clientLower = clientType.toLowerCase();
        String thankYou;
        if (clientLower.contains("corporate") || clientLower.contains("company"))
            thankYou = "Thank you for your continued business partnership. We look forward to a long and mutually rewarding relationship with your organization.";
        else if (clientLower.contains("startup"))
            thankYou = "Thank you for choosing " + businessName + "! We love working with innovative startups and wish you every success.";
        else
            thankYou = "Thank you for your trust and business! We appreciate your support and look forward to serving you again.";

        String invoiceNotes = String.format(
            "• This is a computer-generated invoice and does not require a physical signature.\n" +
            "• Goods/services once delivered are non-refundable unless agreed in writing.\n" +
            "• Please quote the invoice number in all payment references and correspondence with %s.", businessName);

        String serviceTypeLower = serviceType.toLowerCase();
        String warranty;
        if (serviceTypeLower.contains("software") || serviceTypeLower.contains("development"))
            warranty = "A 30-day bug-fix warranty is provided for all deliverables. Feature changes or new requirements beyond the agreed scope are subject to separate billing.";
        else if (serviceTypeLower.contains("design") || serviceTypeLower.contains("creative"))
            warranty = "Final design files will be delivered upon receipt of full payment. Revisions beyond the agreed number of rounds will be billed at an hourly rate.";
        else if (serviceTypeLower.contains("consult"))
            warranty = "All advice and recommendations are provided based on information available at the time of engagement. " + businessName + " is not liable for outcomes resulting from client implementation decisions.";
        else
            warranty = "Services are provided as described in the scope of work. Any additional requirements will be quoted separately.";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("paymentTerms", terms);
        result.put("lateFeeClause", lateFee);
        result.put("thankYouNote", thankYou);
        result.put("invoiceNotes", invoiceNotes);
        result.put("warrantyClause", warranty);
        result.put("aiModel", "InvoiceMate Smart Templates");
        return result;
    }

    private String callGrok(String systemPrompt, String userPrompt) throws Exception {
        if (!isGrokConfigured()) {
            return null;
        }

        String effectiveUrl = grokApiUrl;
        String effectiveModel = getEffectiveModel();
        String key = grokApiKey.trim();

        if (grokApiUrl.contains("api.x.ai")) {
            if (key.startsWith("gsk_")) {
                effectiveUrl = "https://api.groq.com/openai/v1/chat/completions";
            } else if (key.startsWith("sk-")) {
                effectiveUrl = "https://api.openai.com/v1/chat/completions";
            }
        }

        Map<String, Object> reqBody = new LinkedHashMap<>();
        reqBody.put("model", effectiveModel);
        reqBody.put("temperature", 0.2);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", userPrompt));
        reqBody.put("messages", messages);

        String json = objectMapper.writeValueAsString(reqBody);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(effectiveUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + key)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode choices = root.get("choices");
            if (choices != null && choices.isArray() && choices.size() > 0) {
                this.lastError = null;
                return choices.get(0).get("message").get("content").asText();
            }
        } else {
            this.lastError = "HTTP " + response.statusCode() + ": " + response.body();
            log.warn("AI API returned HTTP status {}: {}", response.statusCode(), response.body());
        }
        return null;
    }

    private String cleanJsonResponse(String raw) {
        String clean = raw.trim();
        if (clean.startsWith("```json")) {
            clean = clean.substring(7);
        } else if (clean.startsWith("```")) {
            clean = clean.substring(3);
        }
        if (clean.endsWith("```")) {
            clean = clean.substring(0, clean.length() - 3);
        }
        return clean.trim();
    }

    private Map<String, Object> fallbackParsePrompt(String prompt) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("customerName", "Client Partner");
        data.put("dueDays", 15);
        data.put("discountPercent", 0.0);
        data.put("gstPercent", 18.0);
        data.put("notes", "Generated by InvoiceMate AI Copilot. Thank you for your business!");

        // Try extracting client name e.g. "for XYZ" or "to XYZ"
        Pattern clientPattern = Pattern.compile("(?i)(?:for|to|client)\\s+([A-Za-z0-9&\\s]{3,30}?)(?:\\s+(?:for|at|with|due|apply|,|\\n)|$)");
        Matcher cm = clientPattern.matcher(prompt);
        if (cm.find()) {
            data.put("customerName", cm.group(1).trim());
        }

        // Try extracting discount
        Pattern discPattern = Pattern.compile("(?i)(\\d+(?:\\.\\d+)?)\\s*%\\s*discount");
        Matcher dm = discPattern.matcher(prompt);
        if (dm.find()) {
            try { data.put("discountPercent", Double.parseDouble(dm.group(1))); } catch (Exception ignored) {}
        }

        // Try extracting GST
        Pattern gstPattern = Pattern.compile("(?i)(\\d+(?:\\.\\d+)?)\\s*%\\s*(?:gst|tax)");
        Matcher gm = gstPattern.matcher(prompt);
        if (gm.find()) {
            try { data.put("gstPercent", Double.parseDouble(gm.group(1))); } catch (Exception ignored) {}
        }

        // Extract items: look for numbers with prices
        List<Map<String, Object>> items = new ArrayList<>();
        Pattern itemPattern = Pattern.compile("(?i)(\\d+)?\\s*([a-zA-Z\\s]{3,40}?)\\s*(?:at|@|for|₹|rs\\.?|inr)?\\s*([0-9,]+(?:\\.\\d{2})?)");
        Matcher im = itemPattern.matcher(prompt);

        while (im.find()) {
            String qtyStr = im.group(1);
            String name = im.group(2).trim();
            String priceStr = im.group(3).replace(",", "").trim();

            if (!name.equalsIgnoreCase("gst") && !name.equalsIgnoreCase("tax") && !name.equalsIgnoreCase("discount") && !priceStr.isEmpty()) {
                double qty = 1.0;
                if (qtyStr != null && !qtyStr.isBlank()) {
                    try { qty = Double.parseDouble(qtyStr.trim()); } catch (Exception ignored) {}
                }
                double price = 0.0;
                try { price = Double.parseDouble(priceStr); } catch (Exception ignored) {}

                if (price > 0 && !name.isEmpty()) {
                    items.add(Map.of(
                        "name", capitalize(name),
                        "quantity", qty,
                        "price", price,
                        "hsnSacCode", "998311"
                    ));
                }
            }
        }

        if (items.isEmpty()) {
            items.add(Map.of(
                "name", "Professional Services / Retainer",
                "quantity", 1.0,
                "price", 15000.0,
                "hsnSacCode", "998311"
            ));
        }

        data.put("items", items);
        return data;
    }

    private double getDouble(Map<String, Object> map, String key, double defaultVal) {
        if (map == null || !map.containsKey(key) || map.get(key) == null) return defaultVal;
        try {
            return Double.parseDouble(map.get(key).toString());
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private String capitalize(String text) {
        if (text == null || text.isEmpty()) return text;
        return Character.toUpperCase(text.charAt(0)) + text.substring(1);
    }
}
