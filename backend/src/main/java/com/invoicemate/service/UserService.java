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
        if (req.getTheme() != null) user.setTheme(req.getTheme());
        return userRepository.save(user);
    }

    @Transactional
    public String saveLogo(Long userId, MultipartFile file) {
        try {
            String dir = "./uploads/logos/";
            File uploadDir = new File(dir);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            String cleanFileName = System.currentTimeMillis() + "_" + file.getOriginalFilename().replaceAll("[^a-zA-Z0-9.-]", "_");
            File dest = new File(uploadDir, cleanFileName);
            file.transferTo(dest);

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
