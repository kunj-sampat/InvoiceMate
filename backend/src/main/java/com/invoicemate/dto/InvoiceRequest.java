package com.invoicemate.dto;

import java.time.LocalDate;
import java.util.List;

public class InvoiceRequest {
    private Long customerId;
    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private List<InvoiceItemRequest> items;
    private double discountPercent;
    private double gstPercent;
    private String template;
    private String notes;
    private boolean isDraft;
    private boolean isEstimate = false;
    private String businessName;

    public InvoiceRequest() {}

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public List<InvoiceItemRequest> getItems() { return items; }
    public void setItems(List<InvoiceItemRequest> items) { this.items = items; }
    public double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(double discountPercent) { this.discountPercent = discountPercent; }
    public double getGstPercent() { return gstPercent; }
    public void setGstPercent(double gstPercent) { this.gstPercent = gstPercent; }
    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public boolean isDraft() { return isDraft; }
    public void setDraft(boolean draft) { isDraft = draft; }
    public boolean isEstimate() { return isEstimate; }
    public void setEstimate(boolean estimate) { isEstimate = estimate; }
    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }
}
