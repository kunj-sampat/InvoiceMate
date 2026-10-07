package com.invoicemate.dto;

import java.time.LocalDate;

public class GstInvoiceRecordDto {
    private Long id;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private String customerName;
    private double taxableAmount;
    private double gstPercent;
    private double cgstAmount;
    private double sgstAmount;
    private double totalGst;
    private double grandTotal;
    private String status;

    public GstInvoiceRecordDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }
    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public double getTaxableAmount() { return taxableAmount; }
    public void setTaxableAmount(double taxableAmount) { this.taxableAmount = taxableAmount; }
    public double getGstPercent() { return gstPercent; }
    public void setGstPercent(double gstPercent) { this.gstPercent = gstPercent; }
    public double getCgstAmount() { return cgstAmount; }
    public void setCgstAmount(double cgstAmount) { this.cgstAmount = cgstAmount; }
    public double getSgstAmount() { return sgstAmount; }
    public void setSgstAmount(double sgstAmount) { this.sgstAmount = sgstAmount; }
    public double getTotalGst() { return totalGst; }
    public void setTotalGst(double totalGst) { this.totalGst = totalGst; }
    public double getGrandTotal() { return grandTotal; }
    public void setGrandTotal(double grandTotal) { this.grandTotal = grandTotal; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
