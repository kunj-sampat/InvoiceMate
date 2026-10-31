package com.invoicemate.service;

import com.invoicemate.dto.DashboardResponse;
import com.invoicemate.dto.InvoiceResponse;
import com.invoicemate.dto.RevenueDataPoint;
import com.invoicemate.model.Customer;
import com.invoicemate.model.Invoice;
import com.invoicemate.repository.CustomerRepository;
import com.invoicemate.repository.InvoiceRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;

    public DashboardService(InvoiceRepository invoiceRepository, CustomerRepository customerRepository) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
    }

    public DashboardResponse getSummary(Long userId) {
        List<Invoice> all = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<Invoice> dirty = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (Invoice i : all) {
            if (!i.isDraft() && !i.isEstimate() && !"PAID".equalsIgnoreCase(i.getStatus())
                    && i.getDueDate() != null && i.getDueDate().isBefore(today)
                    && !"OVERDUE".equalsIgnoreCase(i.getStatus())) {
                i.setStatus("OVERDUE");
                dirty.add(i);
            }
        }
        if (!dirty.isEmpty()) {
            invoiceRepository.saveAll(dirty);
        }

        double totalRevenue = 0;
        double totalPaid = 0;
        long totalInvoices = 0;
        long paidCount = 0;
        long pendingCount = 0;
        long overdueCount = 0;

        for (Invoice i : all) {
            if (!i.isEstimate() && !i.isDraft()) {
                totalRevenue += i.getGrandTotal();
                totalPaid += i.getAmountPaid();
                totalInvoices++;

                String st = i.getStatus() != null ? i.getStatus().toUpperCase() : "";
                if ("PAID".equals(st)) {
                    paidCount++;
                } else if ("OVERDUE".equals(st)) {
                    overdueCount++;
                } else if ("PENDING".equals(st) || "PARTIALLY_PAID".equals(st)) {
                    pendingCount++;
                }
            }
        }

        DashboardResponse res = new DashboardResponse();
        res.setTotalRevenue(totalRevenue);
        res.setTotalPaid(totalPaid);
        res.setTotalOutstanding(Math.max(0, totalRevenue - totalPaid));
        res.setTotalInvoices(totalInvoices);
        res.setPaidCount(paidCount);
        res.setPendingCount(pendingCount);
        res.setOverdueCount(overdueCount);

        Map<Long, Customer> customerMap = customerRepository.findByUserId(userId).stream()
                .filter(c -> c.getId() != null)
                .collect(Collectors.toMap(Customer::getId, c -> c, (a, b) -> a));

        List<InvoiceResponse> recent = all.stream()
                .filter(i -> !i.isEstimate())
                .limit(10)
                .map(i -> InvoiceResponse.fromInvoice(i, i.getCustomerId() != null ? customerMap.get(i.getCustomerId()) : null, null))
                .collect(Collectors.toList());

        res.setRecentInvoices(recent);
        return res;
    }

    public List<RevenueDataPoint> getRevenueData(Long userId, String period) {
        // Simplified dummy logic for now
        List<RevenueDataPoint> data = new ArrayList<>();
        RevenueDataPoint p = new RevenueDataPoint();
        p.setLabel("Current");
        p.setRevenue(invoiceRepository.sumGrandTotalByUserId(userId));
        p.setPaid(invoiceRepository.sumAmountPaidByUserId(userId));
        p.setOutstanding(p.getRevenue() - p.getPaid());
        p.setInvoiceCount(invoiceRepository.countByUserId(userId));
        data.add(p);
        return data;
    }
}
