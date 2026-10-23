package com.invoicemate.service;

import com.invoicemate.dto.ChangePasswordRequest;
import com.invoicemate.dto.SettingsRequest;
import com.invoicemate.exception.BadRequestException;
import com.invoicemate.exception.ResourceNotFoundException;
import com.invoicemate.model.*;
import com.invoicemate.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final InvoiceActivityRepository invoiceActivityRepository;
    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final ExpenseRepository expenseRepository;
    private final RecurringInvoiceRepository recurringInvoiceRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       InvoiceRepository invoiceRepository,
                       InvoiceItemRepository invoiceItemRepository,
                       InvoiceActivityRepository invoiceActivityRepository,
                       PaymentRepository paymentRepository,
                       CustomerRepository customerRepository,
                       ProductRepository productRepository,
                       ExpenseRepository expenseRepository,
                       RecurringInvoiceRepository recurringInvoiceRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.invoiceRepository = invoiceRepository;
        this.invoiceItemRepository = invoiceItemRepository;
        this.invoiceActivityRepository = invoiceActivityRepository;
        this.paymentRepository = paymentRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.expenseRepository = expenseRepository;
        this.recurringInvoiceRepository = recurringInvoiceRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional
    public User updateSettings(Long userId, SettingsRequest req) {
        User user = getUserById(userId);
        if (req.getBusinessName() != null) user.setBusinessName(req.getBusinessName());
        if (req.getBusinessAddress() != null) user.setBusinessAddress(req.getBusinessAddress());
        if (req.getBusinessPhone() != null) user.setBusinessPhone(req.getBusinessPhone());
        if (req.getBusinessEmail() != null) user.setBusinessEmail(req.getBusinessEmail());
        if (req.getInvoicePrefix() != null) user.setInvoicePrefix(req.getInvoicePrefix());
        if (req.getNextInvoiceNumber() > 0) user.setNextInvoiceNumber(req.getNextInvoiceNumber());
        if (req.getDefaultGst() >= 0) user.setDefaultGst(req.getDefaultGst());
        if (req.getDefaultPaymentTermsDays() > 0) user.setDefaultPaymentTermsDays(req.getDefaultPaymentTermsDays());
        if (req.getDefaultNotes() != null) user.setDefaultNotes(req.getDefaultNotes());
        if (req.getAccentColor() != null) user.setAccentColor(req.getAccentColor());
        if (req.getInvoiceHeading() != null) user.setInvoiceHeading(req.getInvoiceHeading());
        if (req.getFooterText() != null) user.setFooterText(req.getFooterText());
        if (req.getPaymentInstructions() != null) user.setPaymentInstructions(req.getPaymentInstructions());
        if (req.getUpiId() != null) user.setUpiId(req.getUpiId());
        if (req.getTheme() != null) user.setTheme(req.getTheme());
        if (req.getLogoPath() != null) {
            user.setLogoPath(req.getLogoPath().trim().isEmpty() ? null : req.getLogoPath().trim());
        }
        return userRepository.save(user);
    }

    @Transactional
    public void deleteLogo(Long userId) {
        User user = getUserById(userId);
        user.setLogoPath(null);
        userRepository.save(user);
    }

    @Transactional
    public String saveLogo(Long userId, MultipartFile file) {
        try {
            Path uploadPath = Paths.get("uploads", "logos").toAbsolutePath().normalize();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "logo.png";
            String cleanFileName = System.currentTimeMillis() + "_" + originalName.replaceAll("[^a-zA-Z0-9.-]", "_");
            Path targetFile = uploadPath.resolve(cleanFileName);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);

            String webPath = "/uploads/logos/" + cleanFileName;
            User user = getUserById(userId);
            user.setLogoPath(webPath);
            userRepository.save(user);
            return webPath;
        } catch (IOException e) {
            throw new RuntimeException("Failed to save logo: " + e.getMessage());
        }
    }

    @Transactional
    public User upgradeToPro(Long userId, int days) {
        User user = getUserById(userId);
        user.setSubscriptionTier("PRO");
        LocalDateTime expiry = LocalDateTime.now().plusDays(days > 0 ? days : 365);
        user.setProExpiryDate(expiry);
        return userRepository.save(user);
    }

    @Transactional
    public void deleteAccount(Long userId) {
        User user = getUserById(userId);

        // 1. Delete all payments of this user
        List<Payment> payments = paymentRepository.findByUserId(userId);
        if (payments != null && !payments.isEmpty()) {
            paymentRepository.deleteAll(payments);
        }

        // 2. Delete all invoice items & activities for this user's invoices
        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (invoices != null) {
            for (Invoice inv : invoices) {
                invoiceItemRepository.deleteByInvoiceId(inv.getId());
                invoiceActivityRepository.deleteByInvoiceId(inv.getId());
            }
            invoiceRepository.deleteAll(invoices);
        }

        // 3. Delete recurring invoices
        List<RecurringInvoice> recurring = recurringInvoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (recurring != null && !recurring.isEmpty()) {
            recurringInvoiceRepository.deleteAll(recurring);
        }

        // 4. Delete expenses
        List<Expense> expenses = expenseRepository.findByUserIdOrderByExpenseDateDesc(userId);
        if (expenses != null && !expenses.isEmpty()) {
            expenseRepository.deleteAll(expenses);
        }

        // 5. Delete products
        List<Product> products = productRepository.findByUserId(userId);
        if (products != null && !products.isEmpty()) {
            productRepository.deleteAll(products);
        }

        // 6. Delete customers
        List<Customer> customers = customerRepository.findByUserId(userId);
        if (customers != null && !customers.isEmpty()) {
            customerRepository.deleteAll(customers);
        }

        // 7. Delete uploaded logo file if exists
        if (user.getLogoPath() != null && user.getLogoPath().startsWith("/uploads/logos/")) {
            try {
                String fileName = user.getLogoPath().replace("/uploads/logos/", "");
                Path filePath = Paths.get("uploads", "logos", fileName).toAbsolutePath().normalize();
                Files.deleteIfExists(filePath);
            } catch (Exception ignored) {}
        }

        // 8. Delete user account from database
        userRepository.delete(user);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest req) {
        User user = getUserById(userId);

        if (req.getCurrentPassword() == null || req.getCurrentPassword().trim().isEmpty()) {
            throw new BadRequestException("Current password cannot be empty");
        }

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        if (req.getNewPassword() == null || req.getNewPassword().length() < 6) {
            throw new BadRequestException("New password must be at least 6 characters long");
        }

        if (req.getConfirmPassword() != null && !req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new BadRequestException("New password and confirmation do not match");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }
}
