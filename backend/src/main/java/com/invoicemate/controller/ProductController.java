package com.invoicemate.controller;

import com.invoicemate.dto.ProductRequest;
import com.invoicemate.model.Product;
import com.invoicemate.service.ProductService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public List<Product> getProducts(@RequestParam(required = false) String search) {
        if (search != null && !search.isEmpty()) {
            return productService.searchProducts(getUserId(), search);
        }
        return productService.getProducts(getUserId());
    }

    @GetMapping("/{id}")
    public Product getProduct(@PathVariable Long id) {
        return productService.getProduct(getUserId(), id);
    }

    @PostMapping
    public Product createProduct(@RequestBody ProductRequest req) {
        return productService.createProduct(getUserId(), req);
    }

    @PutMapping("/{id}")
    public Product updateProduct(@PathVariable Long id, @RequestBody ProductRequest req) {
        return productService.updateProduct(getUserId(), id, req);
    }

    @PatchMapping("/{id}/stock")
    public Product adjustStock(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        int delta = body.getOrDefault("delta", 0);
        return productService.adjustStock(getUserId(), id, delta);
    }

    @DeleteMapping("/{id}")
    public void deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(getUserId(), id);
    }
}
