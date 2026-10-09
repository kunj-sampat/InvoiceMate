package com.invoicemate.dto;

public class GstSlabDto {
    private double rate; // 0, 5, 12, 18
    private double taxableAmount;
    private double cgstAmount;
    private double sgstAmount;
    private double igstAmount;
    private double totalTaxAmount;
    private int invoiceCount;

    public GstSlabDto() {}

    public GstSlabDto(double rate, double taxableAmount, double cgstAmount, double sgstAmount, double igstAmount, double totalTaxAmount, int invoiceCount) {
        this.rate = rate;
        this.taxableAmount = taxableAmount;
        this.cgstAmount = cgstAmount;
        this.sgstAmount = sgstAmount;
        this.igstAmount = igstAmount;
        this.totalTaxAmount = totalTaxAmount;
        this.invoiceCount = invoiceCount;
    }

    public GstSlabDto(double rate, double taxableAmount, double cgstAmount, double sgstAmount, double totalTaxAmount, int invoiceCount) {
        this(rate, taxableAmount, cgstAmount, sgstAmount, 0.0, totalTaxAmount, invoiceCount);
    }

    public double getRate() { return rate; }
    public void setRate(double rate) { this.rate = rate; }
    public double getTaxableAmount() { return taxableAmount; }
    public void setTaxableAmount(double taxableAmount) { this.taxableAmount = taxableAmount; }
    public double getCgstAmount() { return cgstAmount; }
    public void setCgstAmount(double cgstAmount) { this.cgstAmount = cgstAmount; }
    public double getSgstAmount() { return sgstAmount; }
    public void setSgstAmount(double sgstAmount) { this.sgstAmount = sgstAmount; }
    public double getIgstAmount() { return igstAmount; }
    public void setIgstAmount(double igstAmount) { this.igstAmount = igstAmount; }
    public double getTotalTaxAmount() { return totalTaxAmount; }
    public void setTotalTaxAmount(double totalTaxAmount) { this.totalTaxAmount = totalTaxAmount; }
    public int getInvoiceCount() { return invoiceCount; }
    public void setInvoiceCount(int invoiceCount) { this.invoiceCount = invoiceCount; }
}
