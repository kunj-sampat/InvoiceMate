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
            if (!i.isDraft() && !i.isEstimate() && !"PAID".equalsIgnoreCase(i.getStatus())
                    && i.getDueDate() != null && i.getDueDate().isBefore(LocalDate.now())
                    && !"OVERDUE".equalsIgnoreCase(i.getStatus())) {
                i.setStatus("OVERDUE");
                invoiceRepository.save(i);
            }
        });

        DashboardResponse res = new DashboardResponse();
        res.setTotalRevenue(invoiceRepository.sumGrandTotalByUserId(userId));
        res.setTotalPaid(invoiceRepository.sumAmountPaidByUserId(userId));
        res.setTotalOutstanding(res.getTotalRevenue() - res.getTotalPaid());
        
        res.setTotalInvoices(invoiceRepository.countByUserIdAndIsEstimateFalse(userId));
        res.setPaidCount(invoiceRepository.countByUserIdAndStatusAndIsEstimateFalse(userId, "PAID"));
        res.setPendingCount(invoiceRepository.countByUserIdAndStatusAndIsEstimateFalse(userId, "PENDING")
                + invoiceRepository.countByUserIdAndStatusAndIsEstimateFalse(userId, "PARTIALLY_PAID"));
        res.setOverdueCount(invoiceRepository.countByUserIdAndStatusAndIsEstimateFalse(userId, "OVERDUE"));
        
        res.setRecentInvoices(invoiceRepository.findTop10ByUserIdAndIsEstimateFalseOrderByCreatedAtDesc(userId).stream()
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
