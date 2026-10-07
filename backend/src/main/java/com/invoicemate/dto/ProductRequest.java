package com.invoicemate.dto;

public class ProductRequest {
    private String name;
    private String sku;
    private String category = "PRODUCT";
    private String unit = "pcs";
    private String description;
    private String hsnSacCode;
    private double defaultGstPercent = 18.0;
    private double price;
    private Boolean trackInventory = true;
    private Integer stockQuantity = 0;
    private Integer lowStockThreshold = 5;

    public ProductRequest() {}

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
    public Boolean getTrackInventory() { return trackInventory; }
    public void setTrackInventory(Boolean trackInventory) { this.trackInventory = trackInventory; }
    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }
    public Integer getLowStockThreshold() { return lowStockThreshold; }
    public void setLowStockThreshold(Integer lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }
}
