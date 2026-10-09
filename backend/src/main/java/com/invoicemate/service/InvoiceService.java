package com.invoicemate.service;

import com.invoicemate.dto.InvoiceItemRequest;
import com.invoicemate.dto.InvoiceRequest;
import com.invoicemate.dto.InvoiceResponse;
import com.invoicemate.exception.ResourceNotFoundException;
import com.invoicemate.exception.UnauthorizedException;
import com.invoicemate.model.*;
import com.invoicemate.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository itemRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final InvoiceActivityRepository activityRepository;
    private final ProductRepository productRepository;

    public InvoiceService(InvoiceRepository invoiceRepository, InvoiceItemRepository itemRepository,
                          CustomerRepository customerRepository, UserRepository userRepository,
                          InvoiceActivityRepository activityRepository, ProductRepository productRepository) {
        this.invoiceRepository = invoiceRepository;
        this.itemRepository = itemRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.activityRepository = activityRepository;
        this.productRepository = productRepository;
    }

    public List<InvoiceResponse> getInvoices(Long userId, String status, String search, LocalDate from, LocalDate to) {
        List<Invoice> invoices;
        if (search != null && !search.isEmpty()) {
            invoices = invoiceRepository.searchInvoices(userId, search);
        } else if (status != null) {
            invoices = invoiceRepository.findByUserIdAndStatus(userId, status);
        } else if (from != null && to != null) {
            invoices = invoiceRepository.findByUserIdAndInvoiceDateBetween(userId, from, to);
        } else {
            invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }

        return invoices.stream().map(inv -> {
            updateStatusIfOverdue(inv);
            Customer c = customerRepository.findById(inv.getCustomerId()).orElse(null);
            return InvoiceResponse.fromInvoice(inv, c, null);
        }).collect(Collectors.toList());
    }

    public List<InvoiceResponse> getInvoicesByType(Long userId, String search, String status, boolean isEstimate) {
        List<Invoice> invoices;
        if (search != null && !search.isEmpty()) {
            invoices = invoiceRepository.searchInvoices(userId, search);
        } else {
            invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }

        // Filter by isEstimate type
        invoices.removeIf(i -> i.isEstimate() != isEstimate);

        // Filter by status
        if (status != null && !status.isEmpty()) {
            invoices.removeIf(i -> !status.equalsIgnoreCase(i.getStatus()));
        }

        return invoices.stream().map(inv -> {
            updateStatusIfOverdue(inv);
            Customer c = customerRepository.findById(inv.getCustomerId()).orElse(null);
            return InvoiceResponse.fromInvoice(inv, c, null);
        }).collect(Collectors.toList());
    }

    public InvoiceResponse getInvoice(Long userId, Long invoiceId) {
        Invoice inv = getOwnedInvoice(userId, invoiceId);
        updateStatusIfOverdue(inv);
        Customer c = customerRepository.findById(inv.getCustomerId()).orElse(null);
        List<InvoiceItem> items = itemRepository.findByInvoiceId(invoiceId);
        User user = userRepository.findById(userId).orElse(null);
        return InvoiceResponse.fromInvoice(inv, c, items, user);
    }

    @Transactional
    public InvoiceResponse createInvoice(Long userId, InvoiceRequest req) {
        User user = userRepository.findById(userId).orElseThrow();
        Invoice inv = new Invoice();
        inv.setUserId(userId);
        inv.setCustomerId(req.getCustomerId());
        inv.setInvoiceDate(req.getInvoiceDate());
        inv.setDueDate(req.getDueDate());
        
        inv.setDiscountPercent(req.getDiscountPercent());
        inv.setGstPercent(req.getGstPercent());
        inv.setTemplate(req.getTemplate() != null ? req.getTemplate() : "modern");
        inv.setNotes(req.getNotes());
        inv.setDraft(req.isDraft());
        inv.setEstimate(req.isEstimate());

        // Update company name and UPI ID on user if provided in invoice request
        if (req.getBusinessName() != null && !req.getBusinessName().isBlank()) {
            user.setBusinessName(req.getBusinessName().trim());
        }
        if (req.getUpiId() != null && !req.getUpiId().isBlank()) {
            user.setUpiId(req.getUpiId().trim());
        }

        // Generate number based on document type
        if (req.isEstimate()) {
            int nextEst = user.getNextEstimateNumber();
            inv.setInvoiceNumber("EST-" + String.format("%03d", nextEst));
            user.setNextEstimateNumber(nextEst + 1);
        } else {
            String invoiceNumber = user.getInvoicePrefix() + String.format("%04d", user.getNextInvoiceNumber());
            inv.setInvoiceNumber(invoiceNumber);
            user.setNextInvoiceNumber(user.getNextInvoiceNumber() + 1);
        }
        userRepository.save(user);

        calculateTotals(inv, req.getItems());
        inv.setStatus(computeStatus(inv));

        inv = invoiceRepository.save(inv);

        saveItems(inv.getId(), req.getItems(), !req.isDraft() && !req.isEstimate());
        logActivity(inv.getId(), req.isEstimate() ? "Estimate created" : "Invoice created");

        return getInvoice(userId, inv.getId());
    }

    @Transactional
    public InvoiceResponse updateInvoice(Long userId, Long invoiceId, InvoiceRequest req) {
        Invoice inv = getOwnedInvoice(userId, invoiceId);
        inv.setCustomerId(req.getCustomerId());
        inv.setInvoiceDate(req.getInvoiceDate());
        inv.setDueDate(req.getDueDate());
        inv.setDiscountPercent(req.getDiscountPercent());
        inv.setGstPercent(req.getGstPercent());
        inv.setTemplate(req.getTemplate() != null ? req.getTemplate() : inv.getTemplate());
        inv.setNotes(req.getNotes());
        inv.setDraft(req.isDraft());
        
        if ((req.getBusinessName() != null && !req.getBusinessName().isBlank()) || 
            (req.getUpiId() != null && !req.getUpiId().isBlank())) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                if (req.getBusinessName() != null && !req.getBusinessName().isBlank()) {
                    user.setBusinessName(req.getBusinessName().trim());
                }
                if (req.getUpiId() != null && !req.getUpiId().isBlank()) {
                    user.setUpiId(req.getUpiId().trim());
                }
                userRepository.save(user);
            }
        }

        calculateTotals(inv, req.getItems());
        inv.setStatus(computeStatus(inv));
        
        itemRepository.deleteByInvoiceId(inv.getId());
        saveItems(inv.getId(), req.getItems(), false);
        
        invoiceRepository.save(inv);
        logActivity(inv.getId(), "Invoice updated");
        
        return getInvoice(userId, inv.getId());
    }

    @Transactional
    public void deleteInvoice(Long userId, Long invoiceId) {
        Invoice inv = getOwnedInvoice(userId, invoiceId);
        itemRepository.deleteByInvoiceId(inv.getId());
        invoiceRepository.delete(inv);
    }

    @Transactional
    public InvoiceResponse duplicateInvoice(Long userId, Long invoiceId) {
        Invoice original = getOwnedInvoice(userId, invoiceId);
        List<InvoiceItem> items = itemRepository.findByInvoiceId(invoiceId);
        
        InvoiceRequest req = new InvoiceRequest();
        req.setCustomerId(original.getCustomerId());
        req.setInvoiceDate(LocalDate.now());
        req.setDueDate(LocalDate.now().plusDays(30));
        req.setDiscountPercent(original.getDiscountPercent());
        req.setGstPercent(original.getGstPercent());
        req.setTemplate(original.getTemplate());
        req.setNotes(original.getNotes());
        req.setDraft(true);
        
        List<InvoiceItemRequest> itemReqs = items.stream().map(i -> {
            InvoiceItemRequest ir = new InvoiceItemRequest();
            ir.setProductId(i.getProductId());
            ir.setName(i.getName());
            ir.setQuantity(i.getQuantity());
            ir.setPrice(i.getPrice());
            return ir;
        }).collect(Collectors.toList());
        req.setItems(itemReqs);
        
        return createInvoice(userId, req);
    }

    private Invoice getOwnedInvoice(Long userId, Long invoiceId) {
        Invoice inv = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        if (!inv.getUserId().equals(userId)) throw new UnauthorizedException("Not your invoice");
        return inv;
    }

    private void calculateTotals(Invoice inv, List<InvoiceItemRequest> items) {
        double subtotal = 0;
        if (items != null) {
            for (InvoiceItemRequest item : items) {
                subtotal += item.getQuantity() * item.getPrice();
            }
        }
        inv.setSubtotal(subtotal);
        double discountAmount = subtotal * inv.getDiscountPercent() / 100.0;
        inv.setDiscountAmount(discountAmount);
        double afterDiscount = subtotal - discountAmount;
        double gstAmount = afterDiscount * inv.getGstPercent() / 100.0;
        inv.setGstAmount(gstAmount);
        inv.setGrandTotal(afterDiscount + gstAmount);
    }

    private void saveItems(Long invoiceId, List<InvoiceItemRequest> reqItems, boolean deductStock) {
        if (reqItems == null) return;
        for (InvoiceItemRequest reqItem : reqItems) {
            InvoiceItem item = new InvoiceItem();
            item.setInvoiceId(invoiceId);
            item.setProductId(reqItem.getProductId());
            item.setName(reqItem.getName());
            item.setHsnSacCode(reqItem.getHsnSacCode());
            item.setQuantity(reqItem.getQuantity());
            item.setPrice(reqItem.getPrice());
            item.setTotal(reqItem.getQuantity() * reqItem.getPrice());
            itemRepository.save(item);

            if (deductStock && reqItem.getProductId() != null) {
                productRepository.findById(reqItem.getProductId()).ifPresent(prod -> {
                    if (prod.isTrackInventory()) {
                        int newStock = Math.max(0, prod.getStockQuantity() - (int) Math.round(reqItem.getQuantity()));
                        prod.setStockQuantity(newStock);
                        productRepository.save(prod);
                    }
                });
            }
        }
    }

    public String computeStatus(Invoice inv) {
        if (inv.isDraft()) return "DRAFT";
        if (inv.getAmountPaid() >= inv.getGrandTotal()) return "PAID";
        if (inv.getAmountPaid() > 0) return "PARTIALLY_PAID";
        if (inv.getDueDate().isBefore(LocalDate.now())) return "OVERDUE";
        return "PENDING";
    }

    private void updateStatusIfOverdue(Invoice inv) {
        if (!inv.isDraft() && !inv.getStatus().equals("PAID") && inv.getDueDate().isBefore(LocalDate.now())) {
            inv.setStatus("OVERDUE");
            invoiceRepository.save(inv);
        }
    }

    private void logActivity(Long invoiceId, String desc) {
        InvoiceActivity act = new InvoiceActivity();
        act.setInvoiceId(invoiceId);
        act.setDescription(desc);
        activityRepository.save(act);
    }
}
