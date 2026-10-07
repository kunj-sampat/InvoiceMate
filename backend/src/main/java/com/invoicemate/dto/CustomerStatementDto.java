package com.invoicemate.dto;

import java.util.List;

public class CustomerStatementDto {
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String customerAddress;
    private String fromDate;
    private String toDate;
    private Double totalInvoiced;
    private Double totalPaid;
    private Double balanceDue;
    private List<StatementEntryDto> entries;

    public CustomerStatementDto() {}

    // Getters and setters
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public String getCustomerAddress() { return customerAddress; }
    public void setCustomerAddress(String customerAddress) { this.customerAddress = customerAddress; }
    public String getFromDate() { return fromDate; }
    public void setFromDate(String fromDate) { this.fromDate = fromDate; }
    public String getToDate() { return toDate; }
    public void setToDate(String toDate) { this.toDate = toDate; }
    public Double getTotalInvoiced() { return totalInvoiced; }
    public void setTotalInvoiced(Double totalInvoiced) { this.totalInvoiced = totalInvoiced; }
    public Double getTotalPaid() { return totalPaid; }
    public void setTotalPaid(Double totalPaid) { this.totalPaid = totalPaid; }
    public Double getBalanceDue() { return balanceDue; }
    public void setBalanceDue(Double balanceDue) { this.balanceDue = balanceDue; }
    public List<StatementEntryDto> getEntries() { return entries; }
    public void setEntries(List<StatementEntryDto> entries) { this.entries = entries; }
}
