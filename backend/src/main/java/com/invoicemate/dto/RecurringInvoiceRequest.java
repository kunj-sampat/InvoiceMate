package com.invoicemate.dto;

import java.time.LocalDate;
import java.util.List;

public class RecurringInvoiceRequest {
    private Long customerId;
    private String profileName;
    private String frequency = "MONTHLY"; // WEEKLY, MONTHLY, QUARTERLY, YEARLY
    private LocalDate startDate;
    private String template = "modern";
    private double discountPercent = 0.0;
    private double gstPercent = 18.0;
    private String notes;
    private List<InvoiceItemRequest> items;

    public RecurringInvoiceRequest() {}

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getProfileName() { return profileName; }
    public void setProfileName(String profileName) { this.profileName = profileName; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }
    public double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(double discountPercent) { this.discountPercent = discountPercent; }
    public double getGstPercent() { return gstPercent; }
    public void setGstPercent(double gstPercent) { this.gstPercent = gstPercent; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public List<InvoiceItemRequest> getItems() { return items; }
    public void setItems(List<InvoiceItemRequest> items) { this.items = items; }
}
