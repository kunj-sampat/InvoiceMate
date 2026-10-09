package com.invoicemate.service;

import com.invoicemate.dto.GstInvoiceRecordDto;
import com.invoicemate.dto.GstQuarterlyResponse;
import com.invoicemate.dto.GstSlabDto;
import com.invoicemate.dto.ReportResponse;
import com.invoicemate.model.Customer;
import com.invoicemate.model.Invoice;
import com.invoicemate.repository.CustomerRepository;
import com.invoicemate.repository.InvoiceRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
public class ReportService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;
    private final CustomerRepository customerRepository;

    public ReportService(InvoiceRepository invoiceRepository, InvoiceService invoiceService, CustomerRepository customerRepository) {
        this.invoiceRepository = invoiceRepository;
        this.invoiceService = invoiceService;
        this.customerRepository = customerRepository;
    }

    public ReportResponse getReport(Long userId, LocalDate from, LocalDate to, Long customerId, String status) {
        List<Invoice> invoices;
        if (from != null && to != null) {
            invoices = invoiceRepository.findByUserIdAndInvoiceDateBetween(userId, from, to);
        } else {
            invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }
        
        invoices.removeIf(Invoice::isEstimate);

        if (customerId != null) {
            invoices.removeIf(i -> !i.getCustomerId().equals(customerId));
        }
        if (status != null && !status.isEmpty()) {
            invoices.removeIf(i -> !i.getStatus().equals(status));
        }

        ReportResponse res = new ReportResponse();
        res.setTotalInvoices(invoices.size());
        res.setTotalRevenue(invoices.stream().mapToDouble(Invoice::getGrandTotal).sum());
        res.setTotalPaid(invoices.stream().mapToDouble(Invoice::getAmountPaid).sum());
        res.setOutstanding(res.getTotalRevenue() - res.getTotalPaid());
        res.setOverdueCount(invoices.stream().filter(i -> "OVERDUE".equals(i.getStatus())).count());
        
        res.setInvoices(invoices.stream().map(i -> invoiceService.getInvoice(userId, i.getId())).toList());
        return res;
    }

    public GstQuarterlyResponse getGstQuarterlyReport(Long userId, Integer yearParam, String quarterParam) {
        return getGstReport(userId, "QUARTER", yearParam, quarterParam, null);
    }

    public GstQuarterlyResponse getGstReport(Long userId, String periodTypeParam, Integer yearParam, String quarterParam, Integer monthParam) {
        int year = (yearParam != null && yearParam > 2000) ? yearParam : LocalDate.now().getYear();
        String periodType = (periodTypeParam != null && !periodTypeParam.isEmpty()) ? periodTypeParam.toUpperCase() : "QUARTER";
        String q = (quarterParam != null && !quarterParam.isEmpty()) ? quarterParam.toUpperCase() : "Q1";

        LocalDate startDate;
        LocalDate endDate;
        String dateLabel;

        if ("MONTH".equals(periodType) && monthParam != null && monthParam >= 1 && monthParam <= 12) {
            startDate = LocalDate.of(year, monthParam, 1);
            endDate = startDate.plusMonths(1).minusDays(1);
            dateLabel = String.format("01 %s to %02d %s %d",
                    startDate.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH),
                    endDate.getDayOfMonth(),
                    endDate.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH),
                    year);
        } else if ("FY".equals(periodType) || "ALL".equalsIgnoreCase(q)) {
            // Whole Financial Year (Apr to Mar)
            startDate = LocalDate.of(year, 4, 1);
            endDate = LocalDate.of(year + 1, 3, 31);
            dateLabel = "01 Apr " + year + " to 31 Mar " + (year + 1) + " (FY " + year + "-" + ((year + 1) % 100) + ")";
            periodType = "FY";
        } else {
            // Indian Financial Quarters:
            // Q1: Apr 1 - Jun 30
            // Q2: Jul 1 - Sep 30
            // Q3: Oct 1 - Dec 31
            // Q4: Jan 1 - Mar 31 of year + 1
            periodType = "QUARTER";
            switch (q) {
                case "Q2" -> {
                    startDate = LocalDate.of(year, 7, 1);
                    endDate = LocalDate.of(year, 9, 30);
                    dateLabel = "01 Jul " + year + " to 30 Sep " + year + " (Q2)";
                }
                case "Q3" -> {
                    startDate = LocalDate.of(year, 10, 1);
                    endDate = LocalDate.of(year, 12, 31);
                    dateLabel = "01 Oct " + year + " to 31 Dec " + year + " (Q3)";
                }
                case "Q4" -> {
                    startDate = LocalDate.of(year + 1, 1, 1);
                    endDate = LocalDate.of(year + 1, 3, 31);
                    dateLabel = "01 Jan " + (year + 1) + " to 31 Mar " + (year + 1) + " (Q4)";
                }
                default -> { // Q1
                    q = "Q1";
                    startDate = LocalDate.of(year, 4, 1);
                    endDate = LocalDate.of(year, 6, 30);
                    dateLabel = "01 Apr " + year + " to 30 Jun " + year + " (Q1)";
                }
            }
        }

        List<Invoice> rawInvoices = invoiceRepository.findByUserIdAndInvoiceDateBetween(userId, startDate, endDate);
        // Exclude estimates and drafts from official tax filings
        List<Invoice> taxInvoices = rawInvoices.stream()
                .filter(i -> !i.isEstimate() && !i.isDraft())
                .sorted(Comparator.comparing(Invoice::getInvoiceDate).reversed())
                .toList();

        Map<Long, Customer> customerCache = new HashMap<>();

        double totalTaxable = 0.0;
        double totalGst = 0.0;
        double totalGrand = 0.0;

        // Slabs map: rate -> stats (0%, 5%, 12%, 18%, 28%)
        Map<Double, GstSlabDto> slabs = new LinkedHashMap<>();
        for (double r : new double[]{0.0, 5.0, 12.0, 18.0, 28.0}) {
            slabs.put(r, new GstSlabDto(r, 0.0, 0.0, 0.0, 0.0, 0.0, 0));
        }

        List<GstInvoiceRecordDto> records = new ArrayList<>();

        for (Invoice inv : taxInvoices) {
            double sub = inv.getSubtotal() - inv.getDiscountAmount();
            double gst = inv.getGstAmount();
            double grand = inv.getGrandTotal();
            double rate = inv.getGstPercent();

            totalTaxable += sub;
            totalGst += gst;
            totalGrand += grand;

            // Update slab
            GstSlabDto slab = slabs.computeIfAbsent(rate, k -> new GstSlabDto(rate, 0, 0, 0, 0, 0, 0));
            slab.setTaxableAmount(slab.getTaxableAmount() + sub);
            slab.setCgstAmount(slab.getCgstAmount() + (gst / 2.0));
            slab.setSgstAmount(slab.getSgstAmount() + (gst / 2.0));
            slab.setIgstAmount(0.0);
            slab.setTotalTaxAmount(slab.getTotalTaxAmount() + gst);
            slab.setInvoiceCount(slab.getInvoiceCount() + 1);

            // Record item
            GstInvoiceRecordDto rec = new GstInvoiceRecordDto();
            rec.setId(inv.getId());
            rec.setInvoiceNumber(inv.getInvoiceNumber());
            rec.setInvoiceDate(inv.getInvoiceDate());
            rec.setTaxableAmount(sub);
            rec.setGstPercent(rate);
            rec.setCgstAmount(gst / 2.0);
            rec.setSgstAmount(gst / 2.0);
            rec.setIgstAmount(0.0);
            rec.setTotalGst(gst);
            rec.setGrandTotal(grand);
            rec.setStatus(inv.getStatus());

            Customer c = customerCache.computeIfAbsent(inv.getCustomerId(), cid -> customerRepository.findById(cid).orElse(null));
            rec.setCustomerName(c != null ? c.getName() : "Customer #" + inv.getCustomerId());
            rec.setCustomerGstin(c != null && c.getGstin() != null && !c.getGstin().trim().isEmpty() ? c.getGstin().trim() : "N/A");
            records.add(rec);
        }

        GstQuarterlyResponse resp = new GstQuarterlyResponse();
        resp.setPeriodType(periodType);
        resp.setQuarter(q);
        resp.setYear(year);
        resp.setMonth(monthParam);
        resp.setDateRangeLabel(dateLabel);
        resp.setTotalTaxableAmount(totalTaxable);
        resp.setTotalGstAmount(totalGst);
        resp.setTotalCgstAmount(totalGst / 2.0);
        resp.setTotalSgstAmount(totalGst / 2.0);
        resp.setTotalIgstAmount(0.0);
        resp.setTotalGrandAmount(totalGrand);
        resp.setTotalInvoiceCount(taxInvoices.size());
        resp.setSlabBreakdowns(new ArrayList<>(slabs.values()));
        resp.setInvoices(records);

        return resp;
    }

    public List<Map<String, Object>> getTopCustomers(Long userId, LocalDate from, LocalDate to) {
        return new ArrayList<>();
    }
}
