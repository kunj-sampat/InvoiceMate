package com.invoicemate.dto;

public class AuthResponse {
    private String token;
    private String name;
    private String email;
    private String businessName;
    private String logoPath;

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
}
