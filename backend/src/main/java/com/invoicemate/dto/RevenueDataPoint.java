package com.invoicemate.dto;

public class RevenueDataPoint {
    private String label;
    private double revenue;
    private double paid;
    private double outstanding;
    private long invoiceCount;

    public RevenueDataPoint() {}

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public double getRevenue() { return revenue; }
    public void setRevenue(double revenue) { this.revenue = revenue; }
    public double getPaid() { return paid; }
    public void setPaid(double paid) { this.paid = paid; }
    public double getOutstanding() { return outstanding; }
    public void setOutstanding(double outstanding) { this.outstanding = outstanding; }
    public long getInvoiceCount() { return invoiceCount; }
    public void setInvoiceCount(long invoiceCount) { this.invoiceCount = invoiceCount; }
}
