package com.invoicemate.controller;

import com.invoicemate.dto.DashboardResponse;
import com.invoicemate.dto.RevenueDataPoint;
import com.invoicemate.service.DashboardService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    private Long getUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping("/summary")
    public DashboardResponse getSummary() {
        return dashboardService.getSummary(getUserId());
    }

    @GetMapping("/revenue")
    public List<RevenueDataPoint> getRevenue(@RequestParam(required = false, defaultValue = "THIS_MONTH") String period) {
        return dashboardService.getRevenueData(getUserId(), period);
    }
}
