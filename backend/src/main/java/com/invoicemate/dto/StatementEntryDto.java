package com.invoicemate.dto;

import java.time.LocalDate;

public class StatementEntryDto {
    private LocalDate date;
    private String type;      // "INVOICE" or "PAYMENT"
    private String reference; // Invoice number or Payment ref
    private String description;
    private Double debit;     // Invoice total (amount owed)
    private Double credit;    // Payment amount (amount received)
    private Double balance;   // Running balance

    public StatementEntryDto() {}

    public StatementEntryDto(LocalDate date, String type, String reference,
                              String description, Double debit, Double credit, Double balance) {
        this.date = date;
        this.type = type;
        this.reference = reference;
        this.description = description;
        this.debit = debit;
        this.credit = credit;
        this.balance = balance;
    }

    // Getters and setters
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Double getDebit() { return debit; }
    public void setDebit(Double debit) { this.debit = debit; }
    public Double getCredit() { return credit; }
    public void setCredit(Double credit) { this.credit = credit; }
    public Double getBalance() { return balance; }
    public void setBalance(Double balance) { this.balance = balance; }
}
