package com.invoicemate.repository;

import com.invoicemate.model.InvoiceActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InvoiceActivityRepository extends JpaRepository<InvoiceActivity, Long> {
    List<InvoiceActivity> findByInvoiceIdOrderByCreatedAtDesc(Long invoiceId);
}
