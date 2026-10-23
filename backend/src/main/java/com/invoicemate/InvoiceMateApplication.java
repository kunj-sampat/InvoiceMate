package com.invoicemate;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class InvoiceMateApplication {
    public static void main(String[] args) {
        SpringApplication.run(InvoiceMateApplication.class, args);
    }
}
