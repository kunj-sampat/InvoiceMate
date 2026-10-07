package com.invoicemate.controller;

import com.invoicemate.dto.PaymentRequest;
import com.invoicemate.dto.PaymentResponse;
import com.invoicemate.service.PaymentService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public List<PaymentResponse> getPayments(
            @RequestParam(required = false) Long invoiceId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return paymentService.getPayments(getUserId(), invoiceId, from, to);
    }

    @PostMapping
    public PaymentResponse recordPayment(@RequestBody PaymentRequest req) {
        return paymentService.recordPayment(getUserId(), req);
    }
}
