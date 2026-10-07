package com.invoicemate.repository;

import com.invoicemate.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByUserId(Long userId);
    List<Product> findByUserIdAndNameContainingIgnoreCase(Long userId, String name);
}
