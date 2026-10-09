package com.invoicemate.service;

import com.invoicemate.dto.ExpenseRequest;
import com.invoicemate.dto.ExpenseResponse;
import com.invoicemate.dto.ProfitSummaryDto;
import com.invoicemate.exception.ResourceNotFoundException;
import com.invoicemate.exception.UnauthorizedException;
import com.invoicemate.model.Expense;
import com.invoicemate.model.Invoice;
import com.invoicemate.model.Payment;
import com.invoicemate.repository.ExpenseRepository;
import com.invoicemate.repository.InvoiceRepository;
import com.invoicemate.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    public ExpenseService(ExpenseRepository expenseRepository,
                          InvoiceRepository invoiceRepository,
                          PaymentRepository paymentRepository) {
        this.expenseRepository = expenseRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
    }

    public List<ExpenseResponse> getExpenses(Long userId, String category, LocalDate from, LocalDate to, String search) {
        List<Expense> list = expenseRepository.searchAndFilter(userId, category, search, from, to);
        return list.stream().map(ExpenseResponse::fromExpense).collect(Collectors.toList());
    }

    public ExpenseResponse getExpense(Long userId, Long id) {
        Expense expense = expenseRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        return ExpenseResponse.fromExpense(expense);
    }

    @Transactional
    public ExpenseResponse createExpense(Long userId, ExpenseRequest req) {
        if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Expense title is required");
        }
        if (req.getAmount() == null || req.getAmount() < 0) {
            throw new IllegalArgumentException("Valid expense amount is required");
        }
        LocalDate date = req.getExpenseDate() != null ? req.getExpenseDate() : LocalDate.now();
        String cat = (req.getCategory() != null && !req.getCategory().trim().isEmpty()) ? req.getCategory().trim() : "Other";
        String method = (req.getPaymentMethod() != null && !req.getPaymentMethod().trim().isEmpty()) ? req.getPaymentMethod().trim() : "Bank Transfer";

        Expense expense = new Expense(userId, req.getTitle().trim(), cat, req.getAmount(), date, method, req.getNotes());
        Expense saved = expenseRepository.save(expense);
        return ExpenseResponse.fromExpense(saved);
    }

    @Transactional
    public ExpenseResponse updateExpense(Long userId, Long id, ExpenseRequest req) {
        Expense expense = expenseRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        if (req.getTitle() != null && !req.getTitle().trim().isEmpty()) {
            expense.setTitle(req.getTitle().trim());
        }
        if (req.getCategory() != null && !req.getCategory().trim().isEmpty()) {
            expense.setCategory(req.getCategory().trim());
        }
        if (req.getAmount() != null && req.getAmount() >= 0) {
            expense.setAmount(req.getAmount());
        }
        if (req.getExpenseDate() != null) {
            expense.setExpenseDate(req.getExpenseDate());
        }
        if (req.getPaymentMethod() != null) {
            expense.setPaymentMethod(req.getPaymentMethod().trim());
        }
        if (req.getNotes() != null) {
            expense.setNotes(req.getNotes());
        }

        Expense updated = expenseRepository.save(expense);
        return ExpenseResponse.fromExpense(updated);
    }

    @Transactional
    public void deleteExpense(Long userId, Long id) {
        Expense expense = expenseRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        expenseRepository.delete(expense);
    }

    public ProfitSummaryDto getProfitSummary(Long userId, LocalDate from, LocalDate to) {
        ProfitSummaryDto summary = new ProfitSummaryDto();

        // 1. Fetch Invoices in Scope (excluding estimates and drafts)
        List<Invoice> allInvoices = (from != null && to != null)
                ? invoiceRepository.findByUserIdAndInvoiceDateBetween(userId, from, to)
                : invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<Invoice> validInvoices = allInvoices.stream()
                .filter(i -> !i.isEstimate() && !i.isDraft())
                .collect(Collectors.toList());

        double totalInvoiced = validInvoices.stream().mapToDouble(Invoice::getGrandTotal).sum();

        // 2. Fetch Actual Collected Payments (Money Received)
        double totalCollected;
        double invoicePaidSum = validInvoices.stream().mapToDouble(Invoice::getAmountPaid).sum();
        if (from != null && to != null) {
            double paymentSum = paymentRepository.sumAmountByUserIdAndPaymentDateBetween(userId, from, to);
            totalCollected = Math.max(paymentSum, invoicePaidSum);
        } else {
            double paymentSum = paymentRepository.sumAmountByUserId(userId);
            totalCollected = Math.max(paymentSum, invoicePaidSum);
        }

        // 3. Fetch Expenses
        List<Expense> expenses = (from != null && to != null)
                ? expenseRepository.findByUserIdAndExpenseDateBetweenOrderByExpenseDateDesc(userId, from, to)
                : expenseRepository.findByUserIdOrderByExpenseDateDesc(userId);

        double totalExpenses = expenses.stream().mapToDouble(Expense::getAmount).sum();

        // 4. Calculate Net Profit based on ACTUAL MONEY COLLECTED
        // Formula: Net Profit = Total Collected - Total Expenses
        double netProfit = totalCollected - totalExpenses;
        double pendingAmount = Math.max(0.0, totalInvoiced - totalCollected);
        double collectionRate = totalInvoiced > 0 ? Math.min((totalCollected / totalInvoiced) * 100.0, 100.0) : 0.0;

        summary.setTotalInvoiced(totalInvoiced);
        summary.setTotalCollected(totalCollected);
        summary.setTotalExpenses(totalExpenses);
        summary.setPendingAmount(pendingAmount);
        summary.setNetProfit(netProfit);
        summary.setCollectionRate(collectionRate);
        summary.setExpenseCount(expenses.size());
        summary.setInvoiceCount(validInvoices.size());

        // 5. Category Breakdown
        Map<String, Double> catMap = new LinkedHashMap<>();
        for (Expense e : expenses) {
            catMap.put(e.getCategory(), catMap.getOrDefault(e.getCategory(), 0.0) + e.getAmount());
        }
        summary.setCategoryTotals(catMap);

        // 6. Monthly Breakdown for Last 6 Months (Revenue vs Expenses vs Profit)
        LocalDate today = LocalDate.now();
        List<ProfitSummaryDto.MonthlyPoint> monthlyList = new ArrayList<>();

        for (int i = 5; i >= 0; i--) {
            LocalDate mStart = today.minusMonths(i).withDayOfMonth(1);
            LocalDate mEnd = mStart.plusMonths(1).minusDays(1);
            String mShort = mStart.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            String fullDate = mShort + " " + mStart.getYear();

            // Monthly Invoiced
            double mInvoiced = validInvoices.stream()
                    .filter(inv -> inv.getInvoiceDate() != null && !inv.getInvoiceDate().isBefore(mStart) && !inv.getInvoiceDate().isAfter(mEnd))
                    .mapToDouble(Invoice::getGrandTotal).sum();

            // Monthly Collected
            double mPaymentSum = paymentRepository.sumAmountByUserIdAndPaymentDateBetween(userId, mStart, mEnd);
            double mInvoicePaid = validInvoices.stream()
                    .filter(inv -> inv.getInvoiceDate() != null && !inv.getInvoiceDate().isBefore(mStart) && !inv.getInvoiceDate().isAfter(mEnd))
                    .mapToDouble(Invoice::getAmountPaid).sum();
            double mCollected = Math.max(mPaymentSum, mInvoicePaid);

            // Monthly Expenses
            double mExpenses = expenseRepository.sumAmountByUserIdAndExpenseDateBetween(userId, mStart, mEnd);

            // Monthly Profit = Collected - Expenses
            double mProfit = mCollected - mExpenses;

            monthlyList.add(new ProfitSummaryDto.MonthlyPoint(mShort, fullDate, mInvoiced, mCollected, mExpenses, mProfit));
        }

        summary.setMonthlyBreakdown(monthlyList);

        return summary;
    }
}
