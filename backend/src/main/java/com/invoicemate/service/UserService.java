package com.invoicemate.service;

import com.invoicemate.dto.SettingsRequest;
import com.invoicemate.exception.ResourceNotFoundException;
import com.invoicemate.model.User;
import com.invoicemate.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
        return userRepository.save(user);
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
}
