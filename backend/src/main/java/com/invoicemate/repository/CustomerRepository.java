package com.invoicemate.repository;

import com.invoicemate.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByUserId(Long userId);
    List<Customer> findByUserIdAndNameContainingIgnoreCase(Long userId, String name);
    long countByUserId(Long userId);
    java.util.Optional<Customer> findByIdAndUserId(Long id, Long userId);
}
