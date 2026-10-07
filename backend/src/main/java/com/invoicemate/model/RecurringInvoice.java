package com.invoicemate.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "recurring_invoices")
public class RecurringInvoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false)
    private String profileName; // e.g. "Monthly Retainer"

    @Column(nullable = false)
    private String frequency = "MONTHLY"; // WEEKLY, MONTHLY, QUARTERLY, YEARLY

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate nextIssueDate;

    private LocalDate lastIssuedDate;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE, PAUSED

    private String template = "modern";
    private double discountPercent = 0.0;
    private double gstPercent = 18.0;

    @Column(length = 1000)
    private String notes;

    private double subtotal = 0.0;
    private double grandTotal = 0.0;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String itemsJson;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public RecurringInvoice() {}

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (frequency == null || frequency.isEmpty()) frequency = "MONTHLY";
        if (status == null || status.isEmpty()) status = "ACTIVE";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
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
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
