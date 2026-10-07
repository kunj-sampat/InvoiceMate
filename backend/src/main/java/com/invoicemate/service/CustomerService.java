package com.invoicemate.service;

import com.invoicemate.dto.CustomerRequest;
import com.invoicemate.dto.CustomerResponse;
import com.invoicemate.exception.ResourceNotFoundException;
import com.invoicemate.exception.UnauthorizedException;
import com.invoicemate.model.Customer;
import com.invoicemate.model.Invoice;
import com.invoicemate.repository.CustomerRepository;
import com.invoicemate.repository.InvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CustomerService {
    
    private final CustomerRepository customerRepository;
    private final InvoiceRepository invoiceRepository;

    public CustomerService(CustomerRepository customerRepository, InvoiceRepository invoiceRepository) {
        this.customerRepository = customerRepository;
        this.invoiceRepository = invoiceRepository;
    }

    public List<Customer> getCustomers(Long userId) {
        return customerRepository.findByUserId(userId);
    }

    public List<Customer> searchCustomers(Long userId, String query) {
        return customerRepository.findByUserIdAndNameContainingIgnoreCase(userId, query);
    }

    public CustomerResponse getCustomerDetail(Long userId, Long customerId) {
        Customer c = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        if (!c.getUserId().equals(userId)) throw new UnauthorizedException("Not your customer");
        
        CustomerResponse res = new CustomerResponse(c);
        List<Invoice> invoices = invoiceRepository.findByUserIdAndCustomerId(userId, customerId);
        res.setInvoiceCount(invoices.size());
        
        double billed = 0, paid = 0;
        for (Invoice i : invoices) {
            if (!i.isDraft()) {
                billed += i.getGrandTotal();
                paid += i.getAmountPaid();
            }
        }
        res.setTotalBilled(billed);
        res.setTotalPaid(paid);
        res.setOutstanding(billed - paid);
        return res;
    }

    @Transactional
    public Customer createCustomer(Long userId, CustomerRequest req) {
        Customer c = new Customer();
        c.setUserId(userId);
        c.setName(req.getName());
        c.setEmail(req.getEmail());
        c.setPhone(req.getPhone());
        c.setAddress(req.getAddress());
        return customerRepository.save(c);
    }

    @Transactional
    public Customer updateCustomer(Long userId, Long customerId, CustomerRequest req) {
        Customer c = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        if (!c.getUserId().equals(userId)) throw new UnauthorizedException("Not your customer");
        
        c.setName(req.getName());
        c.setEmail(req.getEmail());
        c.setPhone(req.getPhone());
        c.setAddress(req.getAddress());
        return customerRepository.save(c);
    }

    @Transactional
    public void deleteCustomer(Long userId, Long customerId) {
        Customer c = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        if (!c.getUserId().equals(userId)) throw new UnauthorizedException("Not your customer");
        customerRepository.delete(c);
    }

    public com.invoicemate.dto.CustomerStatementDto getStatement(Long customerId, Long userId, java.time.LocalDate from, java.time.LocalDate to) {
        com.invoicemate.model.Customer customer = customerRepository.findByIdAndUserId(customerId, userId)
            .orElseThrow(() -> new com.invoicemate.exception.ResourceNotFoundException("Customer not found"));
        
        // Get all non-estimate invoices for this customer in the date range
        List<com.invoicemate.model.Invoice> invoices = invoiceRepository.findByCustomerIdAndUserIdAndIsEstimateFalseAndInvoiceDateBetween(
            customerId, userId, from, to
        );
        
        // Build entries list
        List<com.invoicemate.dto.StatementEntryDto> entries = new java.util.ArrayList<>();
        double runningBalance = 0.0;
        double totalInvoiced = 0.0;
        double totalPaid = 0.0;
        
        for (com.invoicemate.model.Invoice inv : invoices) {
            double invTotal = inv.getGrandTotal();
            runningBalance += invTotal;
            totalInvoiced += invTotal;
            entries.add(new com.invoicemate.dto.StatementEntryDto(
                inv.getInvoiceDate(),
                "INVOICE",
                inv.getInvoiceNumber(),
                "Invoice to " + customer.getName(),
                invTotal,
                null,
                runningBalance
            ));
            
            // Add payments for this invoice
            if (inv.getPayments() != null) {
                for (com.invoicemate.model.Payment payment : inv.getPayments()) {
                    if (payment.getPaymentDate() != null &&
                        !payment.getPaymentDate().isBefore(from) &&
                        !payment.getPaymentDate().isAfter(to)) {
                        double paidAmt = payment.getAmount();
                        runningBalance -= paidAmt;
                        totalPaid += paidAmt;
                        entries.add(new com.invoicemate.dto.StatementEntryDto(
                            payment.getPaymentDate(),
                            "PAYMENT",
                            payment.getPaymentMethod() != null ? payment.getPaymentMethod() : "Payment",
                            "Payment for " + inv.getInvoiceNumber(),
                            null,
                            paidAmt,
                            runningBalance
                        ));
                    }
                }
            }
        }
        
        // Sort entries by date
        entries.sort(java.util.Comparator.comparing(com.invoicemate.dto.StatementEntryDto::getDate));
        
        com.invoicemate.dto.CustomerStatementDto stmt = new com.invoicemate.dto.CustomerStatementDto();
        stmt.setCustomerId(customerId);
        stmt.setCustomerName(customer.getName());
        stmt.setCustomerEmail(customer.getEmail());
        stmt.setCustomerPhone(customer.getPhone());
        stmt.setCustomerAddress(customer.getAddress());
        stmt.setFromDate(from.toString());
        stmt.setToDate(to.toString());
        stmt.setTotalInvoiced(totalInvoiced);
        stmt.setTotalPaid(totalPaid);
        stmt.setBalanceDue(totalInvoiced - totalPaid);
        stmt.setEntries(entries);
        return stmt;
    }
}
