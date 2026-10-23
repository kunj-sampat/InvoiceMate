package com.invoicemate.repository;

import com.invoicemate.model.InvoiceActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface InvoiceActivityRepository extends JpaRepository<InvoiceActivity, Long> {
    List<InvoiceActivity> findByInvoiceIdOrderByCreatedAtDesc(Long invoiceId);

    @Modifying
    @Transactional
    void deleteByInvoiceId(Long invoiceId);
}
