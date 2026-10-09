package com.invoicemate.dto;

import com.invoicemate.model.User;

public class SettingsResponse {
    private Long id;
    private String fullName;
    private String email;
    private String businessName;
    private String businessAddress;
    private String businessPhone;
    private String businessEmail;
    private String logoPath;
    private String invoicePrefix;
    private int nextInvoiceNumber;
    private int nextEstimateNumber;
    private double defaultGst;
    private int defaultPaymentTermsDays;
    private String defaultNotes;
    private String accentColor;
    private String invoiceHeading;
    private String footerText;
    private String paymentInstructions;
    private String upiId;
    private String theme;

    public static SettingsResponse from(User u) {
        SettingsResponse r = new SettingsResponse();
        r.id = u.getId();
        r.fullName = u.getFullName();
        r.email = u.getEmail();
        r.businessName = u.getBusinessName();
        r.businessAddress = u.getBusinessAddress();
        r.businessPhone = u.getBusinessPhone();
        r.businessEmail = u.getBusinessEmail();
        r.logoPath = u.getLogoPath();
        r.invoicePrefix = u.getInvoicePrefix();
        r.nextInvoiceNumber = u.getNextInvoiceNumber();
        r.nextEstimateNumber = u.getNextEstimateNumber();
        r.defaultGst = u.getDefaultGst();
        r.defaultPaymentTermsDays = u.getDefaultPaymentTermsDays();
        r.defaultNotes = u.getDefaultNotes();
        r.accentColor = u.getAccentColor();
        r.invoiceHeading = u.getInvoiceHeading();
        r.footerText = u.getFooterText();
        r.paymentInstructions = u.getPaymentInstructions();
        r.upiId = u.getUpiId();
        r.theme = u.getTheme();
        return r;
    }

    // Getters
    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getBusinessName() { return businessName; }
    public String getBusinessAddress() { return businessAddress; }
    public String getBusinessPhone() { return businessPhone; }
    public String getBusinessEmail() { return businessEmail; }
    public String getLogoPath() { return logoPath; }
    public String getInvoicePrefix() { return invoicePrefix; }
    public int getNextInvoiceNumber() { return nextInvoiceNumber; }
    public int getNextEstimateNumber() { return nextEstimateNumber; }
    public double getDefaultGst() { return defaultGst; }
    public int getDefaultPaymentTermsDays() { return defaultPaymentTermsDays; }
    public String getDefaultNotes() { return defaultNotes; }
    public String getAccentColor() { return accentColor; }
    public String getInvoiceHeading() { return invoiceHeading; }
    public String getFooterText() { return footerText; }
    public String getPaymentInstructions() { return paymentInstructions; }
    public String getUpiId() { return upiId; }
    public String getTheme() { return theme; }
}
