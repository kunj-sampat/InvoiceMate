package com.invoicemate.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId;
    
    @Column(nullable = false)
    private String name;
    
    private String sku;
    
    @Column(nullable = false)
    private String category = "PRODUCT"; // "PRODUCT" or "SERVICE"
    
    @Column(nullable = false)
    private String unit = "pcs"; // "pcs", "hrs", "box", "kg", "project"
    
    private String description;
    
    @Column(name = "hsn_sac_code")
    private String hsnSacCode;
    
    @Column(name = "default_gst_percent")
    private double defaultGstPercent = 18.0;
    
    @Column(nullable = false)
    private double price;
    
    @Column(nullable = false)
    private boolean trackInventory = true;
    
    @Column(nullable = false)
    private int stockQuantity = 0;
    
    @Column(nullable = false)
    private int lowStockThreshold = 5;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Product() {}

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (category == null || category.isEmpty()) category = "PRODUCT";
        if (unit == null || unit.isEmpty()) unit = "pcs";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getHsnSacCode() { return hsnSacCode; }
    public void setHsnSacCode(String hsnSacCode) { this.hsnSacCode = hsnSacCode; }
    public double getDefaultGstPercent() { return defaultGstPercent; }
    public void setDefaultGstPercent(double defaultGstPercent) { this.defaultGstPercent = defaultGstPercent; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public boolean isTrackInventory() { return trackInventory; }
    public void setTrackInventory(boolean trackInventory) { this.trackInventory = trackInventory; }
    public int getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(int stockQuantity) { this.stockQuantity = stockQuantity; }
    public int getLowStockThreshold() { return lowStockThreshold; }
    public void setLowStockThreshold(int lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
