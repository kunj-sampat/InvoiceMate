package com.invoicemate;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

@EnableAsync
@SpringBootApplication
public class InvoiceMateApplication {
    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(InvoiceMateApplication.class, args);
    }

    private static void loadDotEnv() {
        // Search for .env in current directory, parent directory, and root workspace
        String[] possiblePaths = {".env", "../.env", "../../.env"};
        for (String path : possiblePaths) {
            File envFile = new File(path);
            if (envFile.exists() && envFile.isFile()) {
                try (BufferedReader reader = new BufferedReader(new FileReader(envFile))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) {
                            continue;
                        }
                        int eqIdx = line.indexOf('=');
                        if (eqIdx > 0) {
                            String key = line.substring(0, eqIdx).trim();
                            String val = line.substring(eqIdx + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                                if (val.length() >= 2) {
                                    val = val.substring(1, val.length() - 1);
                                }
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, val);
                            }
                            // Map SPRING_PROFILES_ACTIVE to spring.profiles.active
                            if ("SPRING_PROFILES_ACTIVE".equalsIgnoreCase(key) && System.getProperty("spring.profiles.active") == null) {
                                System.setProperty("spring.profiles.active", val);
                            }
                        }
                    }
                    System.out.println(">> [InvoiceMate] Successfully loaded environment configurations from " + envFile.getAbsolutePath());
                    break;
                } catch (IOException e) {
                    System.err.println(">> [InvoiceMate] Note: Could not read .env at " + path + ": " + e.getMessage());
                }
            }
        }
    }
}
