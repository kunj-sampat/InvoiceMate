package com.invoicemate.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String fullName;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @JsonIgnore
    @Column(nullable = false)
    private String password;
    
    private String businessName;
    private String businessAddress;
    private String businessPhone;
    private String businessEmail;
    private String logoPath;
    
    private String invoicePrefix = "INV";
    private int nextInvoiceNumber = 1;
    
    @Column(name = "next_estimate_number", nullable = false)
    private int nextEstimateNumber = 1;
    
    private double defaultGst = 18.0;
    private int defaultPaymentTermsDays = 30;
    private String defaultNotes;
    
    private String accentColor = "#1e40af";
    private String invoiceHeading = "INVOICE";
    private String footerText;
    private String paymentInstructions;
    private String theme = "light";
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public User() {}

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }
    public String getBusinessAddress() { return businessAddress; }
    public void setBusinessAddress(String businessAddress) { this.businessAddress = businessAddress; }
    public String getBusinessPhone() { return businessPhone; }
    public void setBusinessPhone(String businessPhone) { this.businessPhone = businessPhone; }
    public String getBusinessEmail() { return businessEmail; }
    public void setBusinessEmail(String businessEmail) { this.businessEmail = businessEmail; }
    public String getLogoPath() { return logoPath; }
    public void setLogoPath(String logoPath) { this.logoPath = logoPath; }
    public String getInvoicePrefix() { return invoicePrefix; }
    public void setInvoicePrefix(String invoicePrefix) { this.invoicePrefix = invoicePrefix; }
    public int getNextInvoiceNumber() { return nextInvoiceNumber; }
    public void setNextInvoiceNumber(int nextInvoiceNumber) { this.nextInvoiceNumber = nextInvoiceNumber; }
    public int getNextEstimateNumber() { return nextEstimateNumber; }
    public void setNextEstimateNumber(int nextEstimateNumber) { this.nextEstimateNumber = nextEstimateNumber; }
    public double getDefaultGst() { return defaultGst; }
    public void setDefaultGst(double defaultGst) { this.defaultGst = defaultGst; }
    public int getDefaultPaymentTermsDays() { return defaultPaymentTermsDays; }
    public void setDefaultPaymentTermsDays(int defaultPaymentTermsDays) { this.defaultPaymentTermsDays = defaultPaymentTermsDays; }
    public String getDefaultNotes() { return defaultNotes; }
    public void setDefaultNotes(String defaultNotes) { this.defaultNotes = defaultNotes; }
    public String getAccentColor() { return accentColor; }
    public void setAccentColor(String accentColor) { this.accentColor = accentColor; }
    public String getInvoiceHeading() { return invoiceHeading; }
    public void setInvoiceHeading(String invoiceHeading) { this.invoiceHeading = invoiceHeading; }
    public String getFooterText() { return footerText; }
    public void setFooterText(String footerText) { this.footerText = footerText; }
    public String getPaymentInstructions() { return paymentInstructions; }
    public void setPaymentInstructions(String paymentInstructions) { this.paymentInstructions = paymentInstructions; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
