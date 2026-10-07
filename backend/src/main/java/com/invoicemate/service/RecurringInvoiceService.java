package com.invoicemate.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.invoicemate.dto.InvoiceItemRequest;
import com.invoicemate.dto.InvoiceRequest;
import com.invoicemate.dto.InvoiceResponse;
import com.invoicemate.dto.RecurringInvoiceRequest;
import com.invoicemate.dto.RecurringInvoiceResponse;
import com.invoicemate.exception.ResourceNotFoundException;
import com.invoicemate.model.Customer;
import com.invoicemate.model.RecurringInvoice;
import com.invoicemate.repository.CustomerRepository;
import com.invoicemate.repository.RecurringInvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class RecurringInvoiceService {

    private final RecurringInvoiceRepository recurringRepo;
    private final CustomerRepository customerRepo;
    private final InvoiceService invoiceService;
    private final ObjectMapper objectMapper;

    public RecurringInvoiceService(RecurringInvoiceRepository recurringRepo,
                                   CustomerRepository customerRepo,
                                   InvoiceService invoiceService,
                                   ObjectMapper objectMapper) {
        this.recurringRepo = recurringRepo;
        this.customerRepo = customerRepo;
        this.invoiceService = invoiceService;
        this.objectMapper = objectMapper;
    }

    public List<RecurringInvoiceResponse> getRecurringInvoices(Long userId) {
        List<RecurringInvoice> list = recurringRepo.findByUserIdOrderByCreatedAtDesc(userId);
        return list.stream().map(r -> {
            Customer c = customerRepo.findById(r.getCustomerId()).orElse(null);
            return RecurringInvoiceResponse.from(r, c);
        }).toList();
    }

    public RecurringInvoiceResponse getRecurringInvoice(Long userId, Long id) {
        RecurringInvoice r = recurringRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring invoice not found"));
        Customer c = customerRepo.findById(r.getCustomerId()).orElse(null);
        return RecurringInvoiceResponse.from(r, c);
    }

    @Transactional
    public RecurringInvoiceResponse createRecurringInvoice(Long userId, RecurringInvoiceRequest req) {
        RecurringInvoice r = new RecurringInvoice();
        r.setUserId(userId);
        r.setCustomerId(req.getCustomerId());
        r.setProfileName(req.getProfileName() != null ? req.getProfileName() : "Recurring Retainer");
        r.setFrequency(req.getFrequency() != null ? req.getFrequency().toUpperCase() : "MONTHLY");
        
        LocalDate start = req.getStartDate() != null ? req.getStartDate() : LocalDate.now();
        r.setStartDate(start);
        r.setNextIssueDate(start);
        r.setStatus("ACTIVE");
        r.setTemplate(req.getTemplate() != null ? req.getTemplate() : "modern");
        r.setDiscountPercent(req.getDiscountPercent());
        r.setGstPercent(req.getGstPercent());
        r.setNotes(req.getNotes());

        calculateAmountsAndStoreItems(r, req.getItems());

        RecurringInvoice saved = recurringRepo.save(r);
        Customer c = customerRepo.findById(saved.getCustomerId()).orElse(null);
        return RecurringInvoiceResponse.from(saved, c);
    }

    @Transactional
    public RecurringInvoiceResponse toggleStatus(Long userId, Long id) {
        RecurringInvoice r = recurringRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring invoice not found"));
        String nextStatus = "ACTIVE".equalsIgnoreCase(r.getStatus()) ? "PAUSED" : "ACTIVE";
        r.setStatus(nextStatus);
        RecurringInvoice saved = recurringRepo.save(r);
        Customer c = customerRepo.findById(saved.getCustomerId()).orElse(null);
        return RecurringInvoiceResponse.from(saved, c);
    }

    @Transactional
    public void deleteRecurringInvoice(Long userId, Long id) {
        RecurringInvoice r = recurringRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring invoice not found"));
        recurringRepo.delete(r);
    }

    @Transactional
    public InvoiceResponse generateNow(Long userId, Long id) {
        RecurringInvoice r = recurringRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring invoice not found"));

        List<InvoiceItemRequest> items = parseItems(r.getItemsJson());

        InvoiceRequest invReq = new InvoiceRequest();
        invReq.setCustomerId(r.getCustomerId());
        invReq.setInvoiceDate(LocalDate.now());
        invReq.setDueDate(LocalDate.now().plusDays(15));
        invReq.setDiscountPercent(r.getDiscountPercent());
        invReq.setGstPercent(r.getGstPercent());
        invReq.setTemplate(r.getTemplate());
        invReq.setNotes(r.getNotes() != null ? r.getNotes() : ("Recurring Invoice - " + r.getProfileName()));
        invReq.setDraft(false);
        invReq.setEstimate(false);
        invReq.setItems(items);

        InvoiceResponse generated = invoiceService.createInvoice(userId, invReq);

        r.setLastIssuedDate(LocalDate.now());
        r.setNextIssueDate(computeNextDate(r.getNextIssueDate(), r.getFrequency()));
        recurringRepo.save(r);

        return generated;
    }

    private void calculateAmountsAndStoreItems(RecurringInvoice r, List<InvoiceItemRequest> items) {
        double subtotal = 0.0;
        if (items != null) {
            for (InvoiceItemRequest i : items) {
                subtotal += i.getQuantity() * i.getPrice();
            }
        }
        r.setSubtotal(subtotal);
        double afterDiscount = subtotal - (subtotal * r.getDiscountPercent() / 100.0);
        double tax = afterDiscount * (r.getGstPercent() / 100.0);
        r.setGrandTotal(afterDiscount + tax);

        try {
            r.setItemsJson(objectMapper.writeValueAsString(items != null ? items : new ArrayList<>()));
        } catch (Exception e) {
            r.setItemsJson("[]");
        }
    }

    private List<InvoiceItemRequest> parseItems(String itemsJson) {
        if (itemsJson == null || itemsJson.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(itemsJson, new TypeReference<List<InvoiceItemRequest>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private LocalDate computeNextDate(LocalDate current, String frequency) {
        LocalDate base = current != null ? current : LocalDate.now();
        if ("WEEKLY".equalsIgnoreCase(frequency)) return base.plusWeeks(1);
        if ("QUARTERLY".equalsIgnoreCase(frequency)) return base.plusMonths(3);
        if ("YEARLY".equalsIgnoreCase(frequency)) return base.plusYears(1);
        return base.plusMonths(1); // MONTHLY default
    }
}
