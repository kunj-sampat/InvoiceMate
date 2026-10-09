package com.invoicemate.controller;

import com.invoicemate.dto.ExpenseRequest;
import com.invoicemate.dto.ExpenseResponse;
import com.invoicemate.dto.ProfitSummaryDto;
import com.invoicemate.service.ExpenseService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public List<ExpenseResponse> getExpenses(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String search) {
        return expenseService.getExpenses(getUserId(), category, from, to, search);
    }

    @GetMapping("/{id}")
    public ExpenseResponse getExpense(@PathVariable Long id) {
        return expenseService.getExpense(getUserId(), id);
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> createExpense(@RequestBody ExpenseRequest req) {
        ExpenseResponse res = expenseService.createExpense(getUserId(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PutMapping("/{id}")
    public ExpenseResponse updateExpense(@PathVariable Long id, @RequestBody ExpenseRequest req) {
        return expenseService.updateExpense(getUserId(), id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        expenseService.deleteExpense(getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/profit-summary")
    public ProfitSummaryDto getProfitSummary(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return expenseService.getProfitSummary(getUserId(), from, to);
    }

    @GetMapping("/categories")
    public List<String> getCategories() {
        return Arrays.asList(
                "Office",
                "Software",
                "Travel",
                "Marketing",
                "Equipment",
                "Rent",
                "Utilities",
                "Salary/Freelancer",
                "Other"
        );
    }
}
