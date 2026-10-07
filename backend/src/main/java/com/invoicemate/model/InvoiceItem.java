package com.invoicemate.model;

import jakarta.persistence.*;

@Entity
@Table(name = "invoice_items")
public class InvoiceItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long invoiceId;
    
    private Long productId;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "hsn_sac_code")
    private String hsnSacCode;
    
    @Column(nullable = false)
    private int quantity;
    
    @Column(nullable = false)
    private double price;
    
    @Column(nullable = false)
    private double total;

    public InvoiceItem() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getInvoiceId() { return invoiceId; }
    public void setInvoiceId(Long invoiceId) { this.invoiceId = invoiceId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getHsnSacCode() { return hsnSacCode; }
    public void setHsnSacCode(String hsnSacCode) { this.hsnSacCode = hsnSacCode; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }
}
