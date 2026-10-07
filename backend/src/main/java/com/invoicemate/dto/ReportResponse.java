package com.invoicemate.dto;

import java.util.List;

public class ReportResponse {
    private long totalInvoices;
    private double totalRevenue;
    private double totalPaid;
    private double outstanding;
    private long overdueCount;
    private List<InvoiceResponse> invoices;

    public ReportResponse() {}

    public long getTotalInvoices() { return totalInvoices; }
    public void setTotalInvoices(long totalInvoices) { this.totalInvoices = totalInvoices; }
    public double getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(double totalRevenue) { this.totalRevenue = totalRevenue; }
    public double getTotalPaid() { return totalPaid; }
    public void setTotalPaid(double totalPaid) { this.totalPaid = totalPaid; }
    public double getOutstanding() { return outstanding; }
    public void setOutstanding(double outstanding) { this.outstanding = outstanding; }
    public long getOverdueCount() { return overdueCount; }
    public void setOverdueCount(long overdueCount) { this.overdueCount = overdueCount; }
    public List<InvoiceResponse> getInvoices() { return invoices; }
    public void setInvoices(List<InvoiceResponse> invoices) { this.invoices = invoices; }
}
