package com.invoicemate.repository;

import com.invoicemate.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByUserIdOrderByExpenseDateDesc(Long userId);

    List<Expense> findByUserIdAndExpenseDateBetweenOrderByExpenseDateDesc(Long userId, LocalDate from, LocalDate to);

    Optional<Expense> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT COALESCE(SUM(e.amount), 0.0) FROM Expense e WHERE e.userId = :userId")
    double sumAmountByUserId(@Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(e.amount), 0.0) FROM Expense e WHERE e.userId = :userId AND e.expenseDate BETWEEN :from AND :to")
    double sumAmountByUserIdAndExpenseDateBetween(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT e FROM Expense e WHERE e.userId = :userId AND " +
           "(:category IS NULL OR :category = '' OR LOWER(e.category) = LOWER(:category)) AND " +
           "(:search IS NULL OR :search = '' OR LOWER(e.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(e.notes) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:from IS NULL OR e.expenseDate >= :from) AND " +
           "(:to IS NULL OR e.expenseDate <= :to) " +
           "ORDER BY e.expenseDate DESC, e.id DESC")
    List<Expense> searchAndFilter(
            @Param("userId") Long userId,
            @Param("category") String category,
            @Param("search") String search,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}
