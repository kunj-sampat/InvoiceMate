package com.invoicemate.dto;

public class SettingsRequest {
    private String businessName;
    private String businessAddress;
    private String businessPhone;
    private String businessEmail;
    
    private String invoicePrefix;
    private int nextInvoiceNumber;
    private double defaultGst;
    private int defaultPaymentTermsDays;
    private String defaultNotes;
    
    private String accentColor;
    private String invoiceHeading;
    private String footerText;
    private String paymentInstructions;
    private String upiId;
    private String theme;

    public SettingsRequest() {}

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }
    public String getBusinessAddress() { return businessAddress; }
    public void setBusinessAddress(String businessAddress) { this.businessAddress = businessAddress; }
    public String getBusinessPhone() { return businessPhone; }
    public void setBusinessPhone(String businessPhone) { this.businessPhone = businessPhone; }
    public String getBusinessEmail() { return businessEmail; }
    public void setBusinessEmail(String businessEmail) { this.businessEmail = businessEmail; }
    public String getInvoicePrefix() { return invoicePrefix; }
    public void setInvoicePrefix(String invoicePrefix) { this.invoicePrefix = invoicePrefix; }
    public int getNextInvoiceNumber() { return nextInvoiceNumber; }
    public void setNextInvoiceNumber(int nextInvoiceNumber) { this.nextInvoiceNumber = nextInvoiceNumber; }
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
    public String getUpiId() { return upiId; }
    public void setUpiId(String upiId) { this.upiId = upiId; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
}
