package com.invoicemate.repository;

import com.invoicemate.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Invoice> findByUserIdAndStatus(Long userId, String status);
    List<Invoice> findByUserIdAndCustomerId(Long userId, Long customerId);
    List<Invoice> findByUserIdAndInvoiceDateBetween(Long userId, LocalDate from, LocalDate to);
    
    @Query("SELECT i FROM Invoice i WHERE i.userId = :userId AND (i.invoiceNumber LIKE %:query% OR i.customerId IN (SELECT c.id FROM Customer c WHERE c.name LIKE %:query%))")
    List<Invoice> searchInvoices(@Param("userId") Long userId, @Param("query") String query);
    
    long countByUserId(Long userId);
    long countByUserIdAndStatus(Long userId, String status);
    
    @Query("SELECT COALESCE(SUM(i.grandTotal), 0) FROM Invoice i WHERE i.userId = :userId AND i.status != 'DRAFT'")
    double sumGrandTotalByUserId(@Param("userId") Long userId);
    
    @Query("SELECT COALESCE(SUM(i.amountPaid), 0) FROM Invoice i WHERE i.userId = :userId AND i.status != 'DRAFT'")
    double sumAmountPaidByUserId(@Param("userId") Long userId);
    
    List<Invoice> findByUserIdAndStatusAndDueDateBefore(Long userId, String status, LocalDate date);
    List<Invoice> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);
    List<Invoice> findByCustomerIdAndUserIdAndIsEstimateFalseAndInvoiceDateBetween(
        Long customerId, Long userId, java.time.LocalDate from, java.time.LocalDate to
    );
}
