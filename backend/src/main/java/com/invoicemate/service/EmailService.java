package com.invoicemate.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${mail.from:noreply@invoicemate.com}")
    private String mailFrom;

    @Value("${mail.enabled:true}")
    private boolean mailEnabled;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String fullName) {
        if (!mailEnabled) {
            log.info("Email service is disabled (mail.enabled=false). Skipping welcome email for {}", toEmail);
            return;
        }

        if (mailSender == null) {
            log.warn("JavaMailSender bean is not available. Please verify spring-boot-starter-mail configuration. Skipping welcome email for {}", toEmail);
            return;
        }

        if (mailUsername == null || mailUsername.trim().isEmpty()) {
            log.info("SMTP credentials not configured (MAIL_USERNAME is empty). Welcome email for {} skipped safely. Set MAIL_USERNAME and MAIL_PASSWORD in application.properties or .env to activate automatic email dispatch.", toEmail);
            return;
        }

        try {
            String displayName = (fullName != null && !fullName.trim().isEmpty()) ? fullName.trim() : "there";

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            String senderAddress = (mailUsername != null && mailUsername.contains("@")) ? mailUsername : mailFrom;
            helper.setFrom(senderAddress, "InvoiceMate");
            helper.setTo(toEmail);
            helper.setSubject("Welcome to InvoiceMate – Your Smart Invoicing Workspace 🚀");

            String htmlBody = buildWelcomeEmailHtml(displayName);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("Welcome email sent successfully to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send welcome email to {}: {}. Continuing without blocking registration.", toEmail, e.getMessage());
        }
    }

    private String buildWelcomeEmailHtml(String displayName) {
        return "<!DOCTYPE html>"
                + "<html lang=\"en\">"
                + "<head>"
                + "  <meta charset=\"UTF-8\">"
                + "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
                + "  <title>Welcome to InvoiceMate</title>"
                + "</head>"
                + "<body style=\"margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;\">"
                + "  <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color:#f1f5f9;padding:40px 16px;\">"
                + "    <tr>"
                + "      <td align=\"center\">"
                + "        <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);border:1px solid #e2e8f0;\">"
                + "          <!-- Header Banner -->"
                + "          <tr>"
                + "            <td style=\"background:linear-gradient(135deg,#2563eb 0%,#1e40af 100%);padding:40px 36px;text-align:left;\">"
                + "              <div style=\"font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;\">"
                + "                Invoice<span style=\"color:#93c5fd;\">Mate</span><span style=\"color:#60a5fa;\">.</span>"
                + "              </div>"
                + "              <div style=\"color:#dbeafe;font-size:14px;margin-top:6px;font-weight:500;\">"
                + "                Simple Invoicing. Smarter Business."
                + "              </div>"
                + "            </td>"
                + "          </tr>"
                + "          <!-- Body Content -->"
                + "          <tr>"
                + "            <td style=\"padding:36px;\">"
                + "              <h1 style=\"font-size:22px;font-weight:700;color:#0f172a;margin:0 0 16px 0;letter-spacing:-0.3px;\">"
                + "                Welcome aboard, " + displayName + "! 🎉"
                + "              </h1>"
                + "              <p style=\"font-size:15px;line-height:1.6;color:#475569;margin:0 0 24px 0;\">"
                + "                We're thrilled to have you with us. Your InvoiceMate workspace is now fully configured and ready for action. You can now effortlessly generate GST-compliant invoices, track customer balances, accept instant UPI payments, and monitor your profit &amp; loss."
                + "              </p>"
                + "              <!-- Quickstart Box -->"
                + "              <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;\">"
                + "                <tr>"
                + "                  <td style=\"padding:20px;\">"
                + "                    <div style=\"font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#2563eb;margin-bottom:14px;\">"
                + "                      🚀 3 Quick Steps to Get Started:"
                + "                    </div>"
                + "                    <div style=\"font-size:14px;color:#334155;line-height:1.8;\">"
                + "                      <strong>1. Set up your Brand</strong>: Upload your business logo &amp; UPI ID in <em>Settings</em>.<br>"
                + "                      <strong>2. Add your Clients</strong>: Save customer contact info &amp; GSTIN for 1-click billing.<br>"
                + "                      <strong>3. Create your First Invoice</strong>: Pick from 4 sleek templates with instant PDF &amp; QR payments."
                + "                    </div>"
                + "                  </td>"
                + "                </tr>"
                + "              </table>"
                + "              <!-- CTA Button -->"
                + "              <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin-bottom:28px;\">"
                + "                <tr>"
                + "                  <td align=\"center\">"
                + "                    <a href=\"http://localhost:8080/dashboard.html\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:999px;box-shadow:0 4px 14px rgba(37,99,235,0.35);\">"
                + "                      Go to Your Dashboard &rarr;"
                + "                    </a>"
                + "                  </td>"
                + "                </tr>"
                + "              </table>"
                + "              <p style=\"font-size:13.5px;line-height:1.6;color:#64748b;margin:0;\">"
                + "                Need help or have questions? Our support team is always ready at "
                + "                <a href=\"mailto:support@invoicemate.com\" style=\"color:#2563eb;text-decoration:none;\">support@invoicemate.com</a>."
                + "              </p>"
                + "            </td>"
                + "          </tr>"
                + "          <!-- Footer -->"
                + "          <tr>"
                + "            <td style=\"background:#f8fafc;border-top:1px solid #e2e8f0;padding:22px 36px;text-align:center;\">"
                + "              <div style=\"font-size:12px;color:#94a3b8;line-height:1.5;\">"
                + "                &copy; 2026 InvoiceMate. All rights reserved.<br>"
                + "                Designed for modern freelancers, businesses &amp; agencies."
                + "              </div>"
                + "            </td>"
                + "          </tr>"
                + "        </table>"
                + "      </td>"
                + "    </tr>"
                + "  </table>"
                + "</body>"
                + "</html>";
    }
}
