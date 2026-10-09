package com.invoicemate.dto;

import java.util.ArrayList;
import java.util.List;

public class GstQuarterlyResponse {
    private String quarter;
    private int year;
    private String periodType = "QUARTER"; // MONTH, QUARTER, FY
    private Integer month;
    private String dateRangeLabel;
    private double totalTaxableAmount;
    private double totalCgstAmount;
    private double totalSgstAmount;
    private double totalIgstAmount;
    private double totalGstAmount;
    private double totalGrandAmount;
    private int totalInvoiceCount;
    private List<GstSlabDto> slabBreakdowns = new ArrayList<>();
    private List<GstInvoiceRecordDto> invoices = new ArrayList<>();

    public GstQuarterlyResponse() {}

    public String getQuarter() { return quarter; }
    public void setQuarter(String quarter) { this.quarter = quarter; }
    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }
    public String getPeriodType() { return periodType; }
    public void setPeriodType(String periodType) { this.periodType = periodType; }
    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }
    public String getDateRangeLabel() { return dateRangeLabel; }
    public void setDateRangeLabel(String dateRangeLabel) { this.dateRangeLabel = dateRangeLabel; }
    public double getTotalTaxableAmount() { return totalTaxableAmount; }
    public void setTotalTaxableAmount(double totalTaxableAmount) { this.totalTaxableAmount = totalTaxableAmount; }
    public double getTotalCgstAmount() { return totalCgstAmount; }
    public void setTotalCgstAmount(double totalCgstAmount) { this.totalCgstAmount = totalCgstAmount; }
    public double getTotalSgstAmount() { return totalSgstAmount; }
    public void setTotalSgstAmount(double totalSgstAmount) { this.totalSgstAmount = totalSgstAmount; }
    public double getTotalIgstAmount() { return totalIgstAmount; }
    public void setTotalIgstAmount(double totalIgstAmount) { this.totalIgstAmount = totalIgstAmount; }
    public double getTotalGstAmount() { return totalGstAmount; }
    public void setTotalGstAmount(double totalGstAmount) { this.totalGstAmount = totalGstAmount; }
    public double getTotalGrandAmount() { return totalGrandAmount; }
    public void setTotalGrandAmount(double totalGrandAmount) { this.totalGrandAmount = totalGrandAmount; }
    public int getTotalInvoiceCount() { return totalInvoiceCount; }
    public void setTotalInvoiceCount(int totalInvoiceCount) { this.totalInvoiceCount = totalInvoiceCount; }
    public List<GstSlabDto> getSlabBreakdowns() { return slabBreakdowns; }
    public void setSlabBreakdowns(List<GstSlabDto> slabBreakdowns) { this.slabBreakdowns = slabBreakdowns; }
    public List<GstInvoiceRecordDto> getInvoices() { return invoices; }
    public void setInvoices(List<GstInvoiceRecordDto> invoices) { this.invoices = invoices; }
}
