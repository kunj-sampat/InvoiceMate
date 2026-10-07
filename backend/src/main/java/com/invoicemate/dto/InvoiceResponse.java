package com.invoicemate.dto;

import com.invoicemate.model.Customer;
import com.invoicemate.model.Invoice;
import com.invoicemate.model.InvoiceItem;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class InvoiceResponse {
    private Long id;
    private Long userId;
    private Long customerId;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private double subtotal;
    private double discountPercent;
    private double discountAmount;
    private double gstPercent;
    private double gstAmount;
    private double grandTotal;
    private double amountPaid;
    private String status;
    private String template;
    private String notes;
    private boolean isDraft;
    private boolean isEstimate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String customerAddress;

    private String businessName;
    private String businessAddress;
    private String businessPhone;
    private String businessEmail;
    private String logoUrl;

    private List<InvoiceItem> items;
    private List<PaymentResponse> payments;

    public InvoiceResponse() {}

    public static InvoiceResponse fromInvoice(Invoice invoice, Customer customer, List<InvoiceItem> items, com.invoicemate.model.User user) {
        InvoiceResponse res = fromInvoice(invoice, customer, items);
        if (user != null) {
            String bName = (user.getBusinessName() != null && !user.getBusinessName().isBlank())
                    ? user.getBusinessName() : user.getFullName();
            res.setBusinessName(bName);
            res.setBusinessAddress(user.getBusinessAddress());
            res.setBusinessPhone(user.getBusinessPhone());
            res.setBusinessEmail((user.getBusinessEmail() != null && !user.getBusinessEmail().isBlank())
                    ? user.getBusinessEmail() : user.getEmail());
            res.setLogoUrl(user.getLogoPath());
        }
        return res;
    }

    public static InvoiceResponse fromInvoice(Invoice invoice, Customer customer, List<InvoiceItem> items) {
        InvoiceResponse res = new InvoiceResponse();
        res.setId(invoice.getId());
        res.setUserId(invoice.getUserId());
        res.setCustomerId(invoice.getCustomerId());
        res.setInvoiceNumber(invoice.getInvoiceNumber());
        res.setInvoiceDate(invoice.getInvoiceDate());
        res.setDueDate(invoice.getDueDate());
        res.setSubtotal(invoice.getSubtotal());
        res.setDiscountPercent(invoice.getDiscountPercent());
        res.setDiscountAmount(invoice.getDiscountAmount());
        res.setGstPercent(invoice.getGstPercent());
        res.setGstAmount(invoice.getGstAmount());
        res.setGrandTotal(invoice.getGrandTotal());
        res.setAmountPaid(invoice.getAmountPaid());
        res.setStatus(invoice.getStatus());
        res.setTemplate(invoice.getTemplate());
        res.setNotes(invoice.getNotes());
        res.setDraft(invoice.isDraft());
        res.setEstimate(invoice.isEstimate());
        res.setCreatedAt(invoice.getCreatedAt());
        res.setUpdatedAt(invoice.getUpdatedAt());

        if (customer != null) {
            res.setCustomerName(customer.getName());
            res.setCustomerEmail(customer.getEmail());
            res.setCustomerPhone(customer.getPhone());
            res.setCustomerAddress(customer.getAddress());
        } else {
            res.setCustomerName(invoice.getCustomerName());
        }
        res.setItems(items);
        return res;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }
    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public double getSubtotal() { return subtotal; }
    public void setSubtotal(double subtotal) { this.subtotal = subtotal; }
    public double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(double discountPercent) { this.discountPercent = discountPercent; }
    public double getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(double discountAmount) { this.discountAmount = discountAmount; }
    public double getGstPercent() { return gstPercent; }
    public void setGstPercent(double gstPercent) { this.gstPercent = gstPercent; }
    public double getGstAmount() { return gstAmount; }
    public void setGstAmount(double gstAmount) { this.gstAmount = gstAmount; }
    public double getGrandTotal() { return grandTotal; }
    public void setGrandTotal(double grandTotal) { this.grandTotal = grandTotal; }
    public double getAmountPaid() { return amountPaid; }
    public void setAmountPaid(double amountPaid) { this.amountPaid = amountPaid; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public boolean isDraft() { return isDraft; }
    public void setDraft(boolean draft) { isDraft = draft; }
    public boolean isEstimate() { return isEstimate; }
    public void setEstimate(boolean estimate) { isEstimate = estimate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public String getCustomerAddress() { return customerAddress; }
    public void setCustomerAddress(String customerAddress) { this.customerAddress = customerAddress; }
    public List<InvoiceItem> getItems() { return items; }
    public void setItems(List<InvoiceItem> items) { this.items = items; }
    public List<PaymentResponse> getPayments() { return payments; }
    public void setPayments(List<PaymentResponse> payments) { this.payments = payments; }
    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }
    public String getBusinessAddress() { return businessAddress; }
    public void setBusinessAddress(String businessAddress) { this.businessAddress = businessAddress; }
    public String getBusinessPhone() { return businessPhone; }
    public void setBusinessPhone(String businessPhone) { this.businessPhone = businessPhone; }
    public String getBusinessEmail() { return businessEmail; }
    public void setBusinessEmail(String businessEmail) { this.businessEmail = businessEmail; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
}
