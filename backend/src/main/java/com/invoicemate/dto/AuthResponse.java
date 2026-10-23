package com.invoicemate.dto;

public class AuthResponse {
    private String token;
    private String name;
    private String email;
    private String businessName;
    private String logoPath;
    private String subscriptionTier = "FREE";
    private java.time.LocalDateTime proExpiryDate;

    public AuthResponse() {}

    public AuthResponse(String token, String name, String email) {
        this.token = token;
        this.name = name;
        this.email = email;
    }

    public AuthResponse(String token, String name, String email, String businessName, String logoPath) {
        this.token = token;
        this.name = name;
        this.email = email;
        this.businessName = businessName;
        this.logoPath = logoPath;
    }

    public AuthResponse(String token, String name, String email, String businessName, String logoPath, String subscriptionTier, java.time.LocalDateTime proExpiryDate) {
        this.token = token;
        this.name = name;
        this.email = email;
        this.businessName = businessName;
        this.logoPath = logoPath;
        this.subscriptionTier = subscriptionTier != null ? subscriptionTier : "FREE";
        this.proExpiryDate = proExpiryDate;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }
    public String getLogoPath() { return logoPath; }
    public void setLogoPath(String logoPath) { this.logoPath = logoPath; }
    public String getSubscriptionTier() { return subscriptionTier; }
    public void setSubscriptionTier(String subscriptionTier) { this.subscriptionTier = subscriptionTier; }
    public java.time.LocalDateTime getProExpiryDate() { return proExpiryDate; }
    public void setProExpiryDate(java.time.LocalDateTime proExpiryDate) { this.proExpiryDate = proExpiryDate; }
}
