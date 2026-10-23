package com.invoicemate.controller;

import com.invoicemate.dto.SettingsRequest;
import com.invoicemate.dto.SettingsResponse;
import com.invoicemate.model.User;
import com.invoicemate.service.UserService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final UserService userService;

    public SettingsController(UserService userService) {
        this.userService = userService;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public SettingsResponse getSettings() {
        User user = userService.getUserById(getUserId());
        return SettingsResponse.from(user);
    }


    @PutMapping("/profile")
    public User updateProfile(@RequestBody SettingsRequest req) {
        return userService.updateSettings(getUserId(), req);
    }

    @PutMapping("/invoice")
    public User updateInvoiceSettings(@RequestBody SettingsRequest req) {
        return userService.updateSettings(getUserId(), req);
    }

    @PutMapping("/appearance")
    public User updateAppearance(@RequestBody SettingsRequest req) {
        return userService.updateSettings(getUserId(), req);
    }

    @PostMapping("/logo")
    public String uploadLogo(@RequestParam("file") MultipartFile file) {
        return userService.saveLogo(getUserId(), file);
    }

    @DeleteMapping("/logo")
    public java.util.Map<String, String> deleteLogo() {
        userService.deleteLogo(getUserId());
        return java.util.Map.of("message", "Logo removed successfully");
    }

    @DeleteMapping("/account")
    public java.util.Map<String, String> deleteAccount() {
        userService.deleteAccount(getUserId());
        return java.util.Map.of("message", "Account and all workspace data permanently deleted");
    }

    @PostMapping("/upgrade")
    public SettingsResponse upgradeToPro(@RequestBody(required = false) java.util.Map<String, Object> payload) {
        int days = 365;
        if (payload != null && payload.containsKey("days")) {
            try {
                days = Integer.parseInt(payload.get("days").toString());
            } catch (Exception ignored) {}
        }
        User user = userService.upgradeToPro(getUserId(), days);
        return SettingsResponse.from(user);
    }

    @PutMapping("/password")
    public java.util.Map<String, String> changePassword(@jakarta.validation.Valid @RequestBody com.invoicemate.dto.ChangePasswordRequest req) {
        userService.changePassword(getUserId(), req);
        return java.util.Map.of("message", "Password updated successfully. Please use your new password next time you sign in.");
    }
}
