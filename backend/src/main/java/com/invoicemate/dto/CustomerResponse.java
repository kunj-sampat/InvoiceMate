package com.invoicemate.dto;

import com.invoicemate.model.Customer;
import java.time.LocalDateTime;

public class CustomerResponse {
    private Long id;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String gstin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private int invoiceCount;
    private double totalBilled;
    private double totalPaid;
    private double outstanding;

    public CustomerResponse() {}

    public CustomerResponse(Customer c) {
        this.id = c.getId();
        this.userId = c.getUserId();
        this.name = c.getName();
        this.email = c.getEmail();
        this.phone = c.getPhone();
        this.address = c.getAddress();
        this.gstin = c.getGstin();
        this.createdAt = c.getCreatedAt();
        this.updatedAt = c.getUpdatedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getGstin() { return gstin; }
    public void setGstin(String gstin) { this.gstin = gstin; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public int getInvoiceCount() { return invoiceCount; }
    public void setInvoiceCount(int invoiceCount) { this.invoiceCount = invoiceCount; }
    public double getTotalBilled() { return totalBilled; }
    public void setTotalBilled(double totalBilled) { this.totalBilled = totalBilled; }
    public double getTotalPaid() { return totalPaid; }
    public void setTotalPaid(double totalPaid) { this.totalPaid = totalPaid; }
    public double getOutstanding() { return outstanding; }
    public void setOutstanding(double outstanding) { this.outstanding = outstanding; }
}
