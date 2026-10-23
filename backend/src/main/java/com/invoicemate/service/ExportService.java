package com.invoicemate.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.invoicemate.model.*;
import com.invoicemate.repository.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ExportService {

    private final UserRepository userRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final ExpenseRepository expenseRepository;
    private final RecurringInvoiceRepository recurringInvoiceRepository;
    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;

    public ExportService(UserRepository userRepository,
                         InvoiceRepository invoiceRepository,
                         InvoiceItemRepository invoiceItemRepository,
                         CustomerRepository customerRepository,
                         ProductRepository productRepository,
                         ExpenseRepository expenseRepository,
                         RecurringInvoiceRepository recurringInvoiceRepository,
                         PaymentRepository paymentRepository) {
        this.userRepository = userRepository;
        this.invoiceRepository = invoiceRepository;
        this.invoiceItemRepository = invoiceItemRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.expenseRepository = expenseRepository;
        this.recurringInvoiceRepository = recurringInvoiceRepository;
        this.paymentRepository = paymentRepository;
        
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
    }

    public String exportInvoicesCsv(Long userId) {
        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<Long, String> customerMap = new HashMap<>();
        customerRepository.findByUserId(userId).forEach(c -> customerMap.put(c.getId(), c.getName()));

        StringBuilder sb = new StringBuilder();
        sb.append("Invoice Number,Date,Due Date,Customer Name,Type,Status,Subtotal,Discount %,Discount Amount,GST %,GST Amount,Grand Total,Amount Paid,Balance Due,Notes\n");

        for (Invoice inv : invoices) {
            String custName = customerMap.getOrDefault(inv.getCustomerId(), "Unknown");
            double balance = Math.max(0, inv.getGrandTotal() - inv.getAmountPaid());
            sb.append(escapeCsv(inv.getInvoiceNumber())).append(",")
              .append(inv.getInvoiceDate() != null ? inv.getInvoiceDate().toString() : "").append(",")
              .append(inv.getDueDate() != null ? inv.getDueDate().toString() : "").append(",")
              .append(escapeCsv(custName)).append(",")
              .append(inv.isEstimate() ? "ESTIMATE" : "INVOICE").append(",")
              .append(escapeCsv(inv.getStatus())).append(",")
              .append(String.format(Locale.US, "%.2f", inv.getSubtotal())).append(",")
              .append(String.format(Locale.US, "%.2f", inv.getDiscountPercent())).append(",")
              .append(String.format(Locale.US, "%.2f", inv.getDiscountAmount())).append(",")
              .append(String.format(Locale.US, "%.2f", inv.getGstPercent())).append(",")
              .append(String.format(Locale.US, "%.2f", inv.getGstAmount())).append(",")
              .append(String.format(Locale.US, "%.2f", inv.getGrandTotal())).append(",")
              .append(String.format(Locale.US, "%.2f", inv.getAmountPaid())).append(",")
              .append(String.format(Locale.US, "%.2f", balance)).append(",")
              .append(escapeCsv(inv.getNotes() != null ? inv.getNotes() : "")).append("\n");
        }

        return sb.toString();
    }

    public String exportCustomersCsv(Long userId) {
        List<Customer> customers = customerRepository.findByUserId(userId);
        StringBuilder sb = new StringBuilder();
        sb.append("Name,Email,Phone,Address,Created At\n");

        for (Customer c : customers) {
            sb.append(escapeCsv(c.getName())).append(",")
              .append(escapeCsv(c.getEmail() != null ? c.getEmail() : "")).append(",")
              .append(escapeCsv(c.getPhone() != null ? c.getPhone() : "")).append(",")
              .append(escapeCsv(c.getAddress() != null ? c.getAddress() : "")).append(",")
              .append(c.getCreatedAt() != null ? c.getCreatedAt().toString() : "").append("\n");
        }

        return sb.toString();
    }

    public byte[] exportFullBackupJson(Long userId) throws Exception {
        User user = userRepository.findById(userId).orElse(null);
        Map<String, Object> backup = new LinkedHashMap<>();

        backup.put("app", "InvoiceMate");
        backup.put("version", "2.0.0");
        backup.put("exportedAt", LocalDateTime.now().toString());

        if (user != null) {
            Map<String, Object> userProfile = new LinkedHashMap<>();
            userProfile.put("id", user.getId());
            userProfile.put("fullName", user.getFullName());
            userProfile.put("email", user.getEmail());
            userProfile.put("businessName", user.getBusinessName());
            userProfile.put("businessAddress", user.getBusinessAddress());
            userProfile.put("businessPhone", user.getBusinessPhone());
            userProfile.put("businessEmail", user.getBusinessEmail());
            userProfile.put("upiId", user.getUpiId());
            userProfile.put("invoicePrefix", user.getInvoicePrefix());
            userProfile.put("defaultGst", user.getDefaultGst());
            backup.put("businessProfile", userProfile);
        }

        List<Customer> customers = customerRepository.findByUserId(userId);
        backup.put("customers", customers);

        List<Product> products = productRepository.findByUserId(userId);
        backup.put("products", products);

        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Map<String, Object>> invoicesWithItems = new ArrayList<>();
        for (Invoice inv : invoices) {
            Map<String, Object> invMap = new LinkedHashMap<>();
            invMap.put("invoice", inv);
            invMap.put("items", invoiceItemRepository.findByInvoiceId(inv.getId()));
            invMap.put("payments", paymentRepository.findByInvoiceId(inv.getId()));
            invoicesWithItems.add(invMap);
        }
        backup.put("invoices", invoicesWithItems);

        List<Expense> expenses = expenseRepository.findByUserIdOrderByExpenseDateDesc(userId);
        backup.put("expenses", expenses);

        List<RecurringInvoice> recurring = recurringInvoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        backup.put("recurringInvoices", recurring);

        return objectMapper.writeValueAsBytes(backup);
    }

    private String escapeCsv(String field) {
        if (field == null) return "\"\"";
        String clean = field.replace("\"", "\"\"");
        if (clean.contains(",") || clean.contains("\n") || clean.contains("\r") || clean.contains("\"")) {
            return "\"" + clean + "\"";
        }
        return "\"" + clean + "\"";
    }
}
