package com.invoicemate.controller;

import com.invoicemate.dto.AuthResponse;
import com.invoicemate.dto.LoginRequest;
import com.invoicemate.dto.RegisterRequest;
import com.invoicemate.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @Value("${linkedin.client-id:${LINKEDIN_CLIENT_ID:}}")
    private String linkedinClientId;

    @Value("${linkedin.client-secret:${LINKEDIN_CLIENT_SECRET:}}")
    private String linkedinClientSecret;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/google")
    public AuthResponse googleLogin(@RequestBody Map<String, String> payload) {
        String credential = payload.get("credential");
        if (credential == null || credential.isBlank()) {
            credential = payload.get("token");
        }
        return authService.loginWithGoogle(credential);
    }

    @PostMapping("/linkedin")
    public AuthResponse linkedinLogin(@RequestBody Map<String, String> payload) {
        String code = payload.get("code");
        String redirectUri = payload.getOrDefault("redirectUri", "http://localhost:8080/oauth-callback.html");
        return authService.loginWithLinkedIn(code, redirectUri, linkedinClientId, linkedinClientSecret);
    }
}
