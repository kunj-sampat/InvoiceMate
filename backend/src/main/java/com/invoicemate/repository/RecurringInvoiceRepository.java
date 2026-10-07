package com.invoicemate.repository;

import com.invoicemate.model.RecurringInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecurringInvoiceRepository extends JpaRepository<RecurringInvoice, Long> {
    List<RecurringInvoice> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<RecurringInvoice> findByIdAndUserId(Long id, Long userId);
    List<RecurringInvoice> findByStatusAndNextIssueDateLessThanEqual(String status, LocalDate date);
}
