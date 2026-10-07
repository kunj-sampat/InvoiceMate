package com.invoicemate.dto;

import java.util.List;

public class DashboardResponse {
    private double totalRevenue;
    private double totalPaid;
    private double totalOutstanding;
    private long totalInvoices;
    private long paidCount;
    private long pendingCount;
    private long overdueCount;
    private List<InvoiceResponse> recentInvoices;

    public DashboardResponse() {}

    public double getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(double totalRevenue) { this.totalRevenue = totalRevenue; }
    public double getTotalPaid() { return totalPaid; }
    public void setTotalPaid(double totalPaid) { this.totalPaid = totalPaid; }
    public double getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(double totalOutstanding) { this.totalOutstanding = totalOutstanding; }
    public long getTotalInvoices() { return totalInvoices; }
    public void setTotalInvoices(long totalInvoices) { this.totalInvoices = totalInvoices; }
    public long getPaidCount() { return paidCount; }
    public void setPaidCount(long paidCount) { this.paidCount = paidCount; }
    public long getPendingCount() { return pendingCount; }
    public void setPendingCount(long pendingCount) { this.pendingCount = pendingCount; }
    public long getOverdueCount() { return overdueCount; }
    public void setOverdueCount(long overdueCount) { this.overdueCount = overdueCount; }
    public List<InvoiceResponse> getRecentInvoices() { return recentInvoices; }
    public void setRecentInvoices(List<InvoiceResponse> recentInvoices) { this.recentInvoices = recentInvoices; }
}
