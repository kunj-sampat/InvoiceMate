package com.invoicemate.dto;

import com.invoicemate.model.Expense;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class ExpenseResponse {

    private Long id;
    private Long userId;
    private String title;
    private String category;
    private Double amount;
    private LocalDate expenseDate;
    private String paymentMethod;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ExpenseResponse() {}

    public static ExpenseResponse fromExpense(Expense e) {
        ExpenseResponse res = new ExpenseResponse();
        res.setId(e.getId());
        res.setUserId(e.getUserId());
        res.setTitle(e.getTitle());
        res.setCategory(e.getCategory());
        res.setAmount(e.getAmount());
        res.setExpenseDate(e.getExpenseDate());
        res.setPaymentMethod(e.getPaymentMethod());
        res.setNotes(e.getNotes());
        res.setCreatedAt(e.getCreatedAt());
        res.setUpdatedAt(e.getUpdatedAt());
        return res;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public LocalDate getExpenseDate() { return expenseDate; }
    public void setExpenseDate(LocalDate expenseDate) { this.expenseDate = expenseDate; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
