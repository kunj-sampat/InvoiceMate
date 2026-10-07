package com.invoicemate.repository;

import com.invoicemate.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByUserId(Long userId);
    List<Payment> findByInvoiceId(Long invoiceId);
    List<Payment> findByUserIdAndPaymentDateBetween(Long userId, LocalDate from, LocalDate to);
    
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.invoiceId = :invoiceId")
    double sumAmountByInvoiceId(@Param("invoiceId") Long invoiceId);
}
