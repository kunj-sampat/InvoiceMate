package com.invoicemate.service;

import com.invoicemate.dto.PaymentRequest;
import com.invoicemate.dto.PaymentResponse;
import com.invoicemate.exception.BadRequestException;
import com.invoicemate.exception.ResourceNotFoundException;
import com.invoicemate.exception.UnauthorizedException;
import com.invoicemate.model.Invoice;
import com.invoicemate.model.InvoiceActivity;
import com.invoicemate.model.Payment;
import com.invoicemate.repository.InvoiceActivityRepository;
import com.invoicemate.repository.InvoiceRepository;
import com.invoicemate.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceActivityRepository activityRepository;
    private final InvoiceService invoiceService;

    public PaymentService(PaymentRepository paymentRepository, InvoiceRepository invoiceRepository,
                          InvoiceActivityRepository activityRepository, InvoiceService invoiceService) {
        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.activityRepository = activityRepository;
        this.invoiceService = invoiceService;
    }

    public List<PaymentResponse> getPayments(Long userId, Long invoiceId, LocalDate from, LocalDate to) {
        List<Payment> payments;
        if (invoiceId != null) {
            payments = paymentRepository.findByInvoiceId(invoiceId);
        } else if (from != null && to != null) {
            payments = paymentRepository.findByUserIdAndPaymentDateBetween(userId, from, to);
        } else {
            payments = paymentRepository.findByUserId(userId);
        }

        return payments.stream().map(p -> {
            PaymentResponse r = new PaymentResponse();
            r.setId(p.getId());
            r.setInvoiceId(p.getInvoiceId());
            r.setAmount(p.getAmount());
            r.setPaymentDate(p.getPaymentDate());
            r.setPaymentMethod(p.getPaymentMethod());
            r.setNotes(p.getNotes());
            r.setCreatedAt(p.getCreatedAt());
            invoiceRepository.findById(p.getInvoiceId()).ifPresent(i -> r.setInvoiceNumber(i.getInvoiceNumber()));
            return r;
        }).collect(Collectors.toList());
    }

    @Transactional
    public PaymentResponse recordPayment(Long userId, PaymentRequest req) {
        Invoice inv = invoiceRepository.findById(req.getInvoiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        if (!inv.getUserId().equals(userId)) throw new UnauthorizedException("Not your invoice");
        
        double remaining = inv.getGrandTotal() - inv.getAmountPaid();
        if (req.getAmount() > remaining + 0.01) { // 0.01 for floating point rounding
            throw new BadRequestException("Amount exceeds remaining balance");
        }

        Payment p = new Payment();
        p.setInvoiceId(inv.getId());
        p.setUserId(userId);
        p.setAmount(req.getAmount());
        p.setPaymentDate(req.getPaymentDate());
        p.setPaymentMethod(req.getPaymentMethod());
        p.setNotes(req.getNotes());
        p = paymentRepository.save(p);

        inv.setAmountPaid(inv.getAmountPaid() + req.getAmount());
        inv.setStatus(invoiceService.computeStatus(inv));
        invoiceRepository.save(inv);

        InvoiceActivity act = new InvoiceActivity();
        act.setInvoiceId(inv.getId());
        act.setDescription("Payment of ₹" + req.getAmount() + " recorded via " + req.getPaymentMethod());
        activityRepository.save(act);

        PaymentResponse r = new PaymentResponse();
        r.setId(p.getId());
        r.setInvoiceId(p.getInvoiceId());
        r.setInvoiceNumber(inv.getInvoiceNumber());
        r.setAmount(p.getAmount());
        r.setPaymentDate(p.getPaymentDate());
        r.setPaymentMethod(p.getPaymentMethod());
        r.setNotes(p.getNotes());
        r.setCreatedAt(p.getCreatedAt());
        return r;
    }
}
