package com.invoicemate.dto;

import com.invoicemate.model.Customer;
import com.invoicemate.model.RecurringInvoice;

import java.time.LocalDate;

public class RecurringInvoiceResponse {
    private Long id;
    private Long customerId;
    private String customerName;
    private String profileName;
    private String frequency;
    private LocalDate startDate;
    private LocalDate nextIssueDate;
    private LocalDate lastIssuedDate;
    private String status;
    private String template;
    private double discountPercent;
    private double gstPercent;
    private String notes;
    private double subtotal;
    private double grandTotal;
    private String itemsJson;

    public RecurringInvoiceResponse() {}

    public static RecurringInvoiceResponse from(RecurringInvoice r, Customer c) {
        RecurringInvoiceResponse res = new RecurringInvoiceResponse();
        res.setId(r.getId());
        res.setCustomerId(r.getCustomerId());
        res.setCustomerName(c != null ? c.getName() : "Customer #" + r.getCustomerId());
        res.setProfileName(r.getProfileName());
        res.setFrequency(r.getFrequency());
        res.setStartDate(r.getStartDate());
        res.setNextIssueDate(r.getNextIssueDate());
        res.setLastIssuedDate(r.getLastIssuedDate());
        res.setStatus(r.getStatus());
        res.setTemplate(r.getTemplate());
        res.setDiscountPercent(r.getDiscountPercent());
        res.setGstPercent(r.getGstPercent());
        res.setNotes(r.getNotes());
        res.setSubtotal(r.getSubtotal());
        res.setGrandTotal(r.getGrandTotal());
        res.setItemsJson(r.getItemsJson());
        return res;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getProfileName() { return profileName; }
    public void setProfileName(String profileName) { this.profileName = profileName; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getNextIssueDate() { return nextIssueDate; }
    public void setNextIssueDate(LocalDate nextIssueDate) { this.nextIssueDate = nextIssueDate; }
    public LocalDate getLastIssuedDate() { return lastIssuedDate; }
    public void setLastIssuedDate(LocalDate lastIssuedDate) { this.lastIssuedDate = lastIssuedDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }
    public double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(double discountPercent) { this.discountPercent = discountPercent; }
    public double getGstPercent() { return gstPercent; }
    public void setGstPercent(double gstPercent) { this.gstPercent = gstPercent; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public double getSubtotal() { return subtotal; }
    public void setSubtotal(double subtotal) { this.subtotal = subtotal; }
    public double getGrandTotal() { return grandTotal; }
    public void setGrandTotal(double grandTotal) { this.grandTotal = grandTotal; }
    public String getItemsJson() { return itemsJson; }
    public void setItemsJson(String itemsJson) { this.itemsJson = itemsJson; }
}
