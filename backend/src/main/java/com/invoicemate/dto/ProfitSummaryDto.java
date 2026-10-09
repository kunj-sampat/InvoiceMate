package com.invoicemate.dto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ProfitSummaryDto {

    private double totalInvoiced;
    private double totalCollected;
    private double totalExpenses;
    private double pendingAmount;
    private double netProfit;
    private double collectionRate;
    private int expenseCount;
    private int invoiceCount;
    private List<MonthlyPoint> monthlyBreakdown = new ArrayList<>();
    private Map<String, Double> categoryTotals = new HashMap<>();

    public ProfitSummaryDto() {}

    public static class MonthlyPoint {
        private String month;      // e.g. "Oct"
        private String fullDate;   // e.g. "Oct 2026"
        private double invoiced;
        private double collected;
        private double expenses;
        private double profit;     // collected - expenses

        public MonthlyPoint() {}

        public MonthlyPoint(String month, String fullDate, double invoiced, double collected, double expenses, double profit) {
            this.month = month;
            this.fullDate = fullDate;
            this.invoiced = invoiced;
            this.collected = collected;
            this.expenses = expenses;
            this.profit = profit;
        }

        public String getMonth() { return month; }
        public void setMonth(String month) { this.month = month; }

        public String getFullDate() { return fullDate; }
        public void setFullDate(String fullDate) { this.fullDate = fullDate; }

        public double getInvoiced() { return invoiced; }
        public void setInvoiced(double invoiced) { this.invoiced = invoiced; }

        public double getCollected() { return collected; }
        public void setCollected(double collected) { this.collected = collected; }

        public double getExpenses() { return expenses; }
        public void setExpenses(double expenses) { this.expenses = expenses; }

        public double getProfit() { return profit; }
        public void setProfit(double profit) { this.profit = profit; }
    }

    public double getTotalInvoiced() { return totalInvoiced; }
    public void setTotalInvoiced(double totalInvoiced) { this.totalInvoiced = totalInvoiced; }

    public double getTotalCollected() { return totalCollected; }
    public void setTotalCollected(double totalCollected) { this.totalCollected = totalCollected; }

    public double getTotalExpenses() { return totalExpenses; }
    public void setTotalExpenses(double totalExpenses) { this.totalExpenses = totalExpenses; }

    public double getPendingAmount() { return pendingAmount; }
    public void setPendingAmount(double pendingAmount) { this.pendingAmount = pendingAmount; }

    public double getNetProfit() { return netProfit; }
    public void setNetProfit(double netProfit) { this.netProfit = netProfit; }

    public double getCollectionRate() { return collectionRate; }
    public void setCollectionRate(double collectionRate) { this.collectionRate = collectionRate; }

    public int getExpenseCount() { return expenseCount; }
    public void setExpenseCount(int expenseCount) { this.expenseCount = expenseCount; }

    public int getInvoiceCount() { return invoiceCount; }
    public void setInvoiceCount(int invoiceCount) { this.invoiceCount = invoiceCount; }

    public List<MonthlyPoint> getMonthlyBreakdown() { return monthlyBreakdown; }
    public void setMonthlyBreakdown(List<MonthlyPoint> monthlyBreakdown) { this.monthlyBreakdown = monthlyBreakdown; }

    public Map<String, Double> getCategoryTotals() { return categoryTotals; }
    public void setCategoryTotals(Map<String, Double> categoryTotals) { this.categoryTotals = categoryTotals; }
}
