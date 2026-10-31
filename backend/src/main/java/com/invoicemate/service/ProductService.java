package com.invoicemate.service;

import com.invoicemate.dto.ProductRequest;
import com.invoicemate.exception.ResourceNotFoundException;
import com.invoicemate.exception.UnauthorizedException;
import com.invoicemate.model.Product;
import com.invoicemate.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<Product> getProducts(Long userId) {
        return productRepository.findByUserId(userId);
    }

    public Product getProduct(Long userId, Long productId) {
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        if (!p.getUserId().equals(userId)) throw new UnauthorizedException("Not your product");
        return p;
    }

    public List<Product> searchProducts(Long userId, String query) {
        return productRepository.findByUserIdAndNameContainingIgnoreCase(userId, query);
    }

    @Transactional
    public List<Product> bulkUpsertProducts(Long userId, List<ProductRequest> requests) {
        List<Product> existing = productRepository.findByUserId(userId);
        Map<String, Product> skuMap = new HashMap<>();
        for (Product p : existing) {
            if (p.getSku() != null && !p.getSku().trim().isEmpty()) {
                skuMap.put(p.getSku().trim().toLowerCase(), p);
            }
        }

        List<Product> toSave = new ArrayList<>();
        for (ProductRequest req : requests) {
            if (req.getName() == null || req.getName().trim().isEmpty()) continue;
            Product p;
            String reqSku = req.getSku() != null ? req.getSku().trim().toLowerCase() : null;
            if (reqSku != null && skuMap.containsKey(reqSku)) {
                p = skuMap.get(reqSku);
            } else {
                p = new Product();
                p.setUserId(userId);
            }
            applyFields(p, req);
            toSave.add(p);
        }
        return productRepository.saveAll(toSave);
    }

    @Transactional
    public Product createProduct(Long userId, ProductRequest req) {
        Product p = new Product();
        p.setUserId(userId);
        applyFields(p, req);
        return productRepository.save(p);
    }

    @Transactional
    public Product updateProduct(Long userId, Long productId, ProductRequest req) {
        Product p = getProduct(userId, productId);
        applyFields(p, req);
        return productRepository.save(p);
    }

    @Transactional
    public Product adjustStock(Long userId, Long productId, int delta) {
        Product p = getProduct(userId, productId);
        int updated = Math.max(0, p.getStockQuantity() + delta);
        p.setStockQuantity(updated);
        return productRepository.save(p);
    }

    @Transactional
    public void deleteProduct(Long userId, Long productId) {
        Product p = getProduct(userId, productId);
        productRepository.delete(p);
    }

    private void applyFields(Product p, ProductRequest req) {
        p.setName(req.getName());
        p.setSku(req.getSku());
        String cat = (req.getCategory() != null && !req.getCategory().isEmpty()) ? req.getCategory().toUpperCase() : "PRODUCT";
        p.setCategory(cat);
        p.setUnit((req.getUnit() != null && !req.getUnit().isEmpty()) ? req.getUnit() : ("SERVICE".equals(cat) ? "hrs" : "pcs"));
        p.setDescription(req.getDescription());
        p.setHsnSacCode(req.getHsnSacCode());
        p.setDefaultGstPercent(req.getDefaultGstPercent() > 0 ? req.getDefaultGstPercent() : 18.0);
        p.setPrice(req.getPrice());
        boolean track = !"SERVICE".equals(cat) && (req.getTrackInventory() == null || req.getTrackInventory());
        p.setTrackInventory(track);
        p.setStockQuantity(req.getStockQuantity() != null ? Math.max(0, req.getStockQuantity()) : 0);
        p.setLowStockThreshold(req.getLowStockThreshold() != null ? Math.max(0, req.getLowStockThreshold()) : 5);
    }
}
