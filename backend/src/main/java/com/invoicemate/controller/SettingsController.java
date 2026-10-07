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
}
