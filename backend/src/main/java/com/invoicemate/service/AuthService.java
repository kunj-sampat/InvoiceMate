package com.invoicemate.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.invoicemate.config.JwtUtil;
import com.invoicemate.dto.AuthResponse;
import com.invoicemate.dto.LoginRequest;
import com.invoicemate.dto.RegisterRequest;
import com.invoicemate.exception.BadRequestException;
import com.invoicemate.exception.UnauthorizedException;
import com.invoicemate.model.User;
import com.invoicemate.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (!req.getPassword().equals(req.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email already taken");
        }
        User user = new User();
        user.setFullName(req.getFullName());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getId());
        return new AuthResponse(token, user.getFullName(), user.getEmail(), user.getBusinessName(), user.getLogoPath());
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        
        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid credentials");
        }
        
        String token = jwtUtil.generateToken(user.getEmail(), user.getId());
        return new AuthResponse(token, user.getFullName(), user.getEmail(), user.getBusinessName(), user.getLogoPath());
    }

    @Transactional
    public AuthResponse loginWithGoogle(String credential) {
        if (credential == null || credential.isBlank()) {
            throw new BadRequestException("Google credential is required");
        }

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request;

            // If JWT ID token (3 parts separated by dots) or access token
            if (credential.contains(".")) {
                request = HttpRequest.newBuilder()
                        .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + credential))
                        .GET()
                        .build();
            } else {
                request = HttpRequest.newBuilder()
                        .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                        .header("Authorization", "Bearer " + credential)
                        .GET()
                        .build();
            }

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UnauthorizedException("Google authentication failed: " + response.body());
            }

            JsonNode node = objectMapper.readTree(response.body());
            String email = node.has("email") ? node.get("email").asText() : null;
            String name = node.has("name") ? node.get("name").asText() : null;

            if (email == null || email.isBlank()) {
                throw new UnauthorizedException("Unable to retrieve email from Google account");
            }

            // Find existing user or auto-register new user
            User user = userRepository.findByEmail(email).orElseGet(() -> {
                User newUser = new User();
                newUser.setEmail(email);
                newUser.setFullName(name != null && !name.isBlank() ? name : email.split("@")[0]);
                newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                return userRepository.save(newUser);
            });

            String token = jwtUtil.generateToken(user.getEmail(), user.getId());
            return new AuthResponse(token, user.getFullName(), user.getEmail(), user.getBusinessName(), user.getLogoPath());

        } catch (UnauthorizedException | BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Google login failed: " + e.getMessage());
        }
    }

    @Transactional
    public AuthResponse loginWithLinkedIn(String code, String redirectUri, String clientId, String clientSecret) {
        if (code == null || code.isBlank()) {
            throw new BadRequestException("LinkedIn authorization code is required");
        }
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new BadRequestException("LinkedIn integration is not configured yet on this server");
        }

        try {
            HttpClient client = HttpClient.newHttpClient();
            String formBody = "grant_type=authorization_code" +
                    "&code=" + URLEncoder.encode(code, StandardCharsets.UTF_8) +
                    "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
                    "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8) +
                    "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8);

            HttpRequest tokenReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.linkedin.com/oauth/v2/accessToken"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();

            HttpResponse<String> tokenRes = client.send(tokenReq, HttpResponse.BodyHandlers.ofString());
            if (tokenRes.statusCode() != 200) {
                throw new UnauthorizedException("LinkedIn token exchange failed: " + tokenRes.body());
            }

            JsonNode tokenNode = objectMapper.readTree(tokenRes.body());
            String accessToken = tokenNode.get("access_token").asText();

            HttpRequest userReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.linkedin.com/v2/userinfo"))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();

            HttpResponse<String> userRes = client.send(userReq, HttpResponse.BodyHandlers.ofString());
            if (userRes.statusCode() != 200) {
                throw new UnauthorizedException("Failed to fetch LinkedIn profile");
            }

            JsonNode userNode = objectMapper.readTree(userRes.body());
            String email = userNode.has("email") ? userNode.get("email").asText() : null;
            String name = userNode.has("name") ? userNode.get("name").asText() : null;

            if (email == null || email.isBlank()) {
                throw new UnauthorizedException("Unable to retrieve email from LinkedIn profile");
            }

            User user = userRepository.findByEmail(email).orElseGet(() -> {
                User newUser = new User();
                newUser.setEmail(email);
                newUser.setFullName(name != null && !name.isBlank() ? name : email.split("@")[0]);
                newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                return userRepository.save(newUser);
            });

            String token = jwtUtil.generateToken(user.getEmail(), user.getId());
            return new AuthResponse(token, user.getFullName(), user.getEmail(), user.getBusinessName(), user.getLogoPath());

        } catch (UnauthorizedException | BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("LinkedIn login failed: " + e.getMessage());
        }
    }
}
