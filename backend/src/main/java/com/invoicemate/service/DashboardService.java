package com.invoicemate.service;

import com.invoicemate.dto.DashboardResponse;
import com.invoicemate.dto.RevenueDataPoint;
import com.invoicemate.model.Invoice;
import com.invoicemate.repository.InvoiceRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;

    public DashboardService(InvoiceRepository invoiceRepository, InvoiceService invoiceService) {
        this.invoiceRepository = invoiceRepository;
        this.invoiceService = invoiceService;
    }

    public DashboardResponse getSummary(Long userId) {
        List<Invoice> all = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        all.forEach(i -> {
            if (!i.isDraft() && !i.getStatus().equals("PAID") && i.getDueDate().isBefore(LocalDate.now()) && !i.getStatus().equals("OVERDUE")) {
                i.setStatus("OVERDUE");
                invoiceRepository.save(i);
            }
        });

        DashboardResponse res = new DashboardResponse();
        res.setTotalRevenue(invoiceRepository.sumGrandTotalByUserId(userId));
        res.setTotalPaid(invoiceRepository.sumAmountPaidByUserId(userId));
        res.setTotalOutstanding(res.getTotalRevenue() - res.getTotalPaid());
        
        res.setTotalInvoices(invoiceRepository.countByUserId(userId));
        res.setPaidCount(invoiceRepository.countByUserIdAndStatus(userId, "PAID"));
        res.setPendingCount(invoiceRepository.countByUserIdAndStatus(userId, "PENDING") + invoiceRepository.countByUserIdAndStatus(userId, "PARTIALLY_PAID"));
        res.setOverdueCount(invoiceRepository.countByUserIdAndStatus(userId, "OVERDUE"));
        
        res.setRecentInvoices(invoiceRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(i -> invoiceService.getInvoice(userId, i.getId())).collect(Collectors.toList()));
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
