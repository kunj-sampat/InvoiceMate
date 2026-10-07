package com.invoicemate.controller;

import com.invoicemate.dto.CustomerRequest;
import com.invoicemate.dto.CustomerResponse;
import com.invoicemate.model.Customer;
import com.invoicemate.service.CustomerService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public List<Customer> getCustomers(@RequestParam(required = false) String search) {
        if (search != null && !search.isEmpty()) {
            return customerService.searchCustomers(getUserId(), search);
        }
        return customerService.getCustomers(getUserId());
    }

    @PostMapping
    public Customer createCustomer(@RequestBody CustomerRequest req) {
        return customerService.createCustomer(getUserId(), req);
    }

    @GetMapping("/{id}")
    public CustomerResponse getCustomerDetail(@PathVariable Long id) {
        return customerService.getCustomerDetail(getUserId(), id);
    }

    @PutMapping("/{id}")
    public Customer updateCustomer(@PathVariable Long id, @RequestBody CustomerRequest req) {
        return customerService.updateCustomer(getUserId(), id, req);
    }

    @DeleteMapping("/{id}")
    public void deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(getUserId(), id);
    }

    @GetMapping("/{id}/statement")
    public com.invoicemate.dto.CustomerStatementDto getStatement(
        @PathVariable Long id,
        @RequestParam(defaultValue = "") String from,
        @RequestParam(defaultValue = "") String to
    ) {
        Long userId = getUserId();
        java.time.LocalDate fromDate = from.isEmpty() 
            ? java.time.LocalDate.now().withDayOfMonth(1) 
            : java.time.LocalDate.parse(from);
        java.time.LocalDate toDate = to.isEmpty() 
            ? java.time.LocalDate.now() 
            : java.time.LocalDate.parse(to);
        return customerService.getStatement(id, userId, fromDate, toDate);
    }
}
