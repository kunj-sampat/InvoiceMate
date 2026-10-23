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

    public boolean isGrokConfigured() {
        return grokApiKey != null && !grokApiKey.trim().isEmpty() && !grokApiKey.contains("your_");
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
                    return objectMapper.readValue(cleanJson, Map.class);
                }
            } catch (Exception e) {
                log.warn("Grok AI API call failed or timed out. Falling back to heuristic smart parser. Error: {}", e.getMessage());
            }
        }

        // Smart Heuristic Fallback
        return fallbackParsePrompt(prompt);
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

    private String callGrok(String systemPrompt, String userPrompt) throws Exception {
        Map<String, Object> reqBody = new LinkedHashMap<>();
        reqBody.put("model", grokModel);
        reqBody.put("temperature", 0.2);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", userPrompt));
        reqBody.put("messages", messages);

        String json = objectMapper.writeValueAsString(reqBody);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(grokApiUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + grokApiKey.trim())
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode choices = root.get("choices");
            if (choices != null && choices.isArray() && choices.size() > 0) {
                return choices.get(0).get("message").get("content").asText();
            }
        } else {
            log.warn("Grok API returned HTTP status {}: {}", response.statusCode(), response.body());
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
