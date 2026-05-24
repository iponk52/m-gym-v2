package scheduler

import (
	"fmt"
	"log"
	"mgym-backend/database"
	"mgym-backend/models"
	"mgym-backend/utils"
	"strings"
	"time"

	"gorm.io/gorm"
)

func StartBillingScheduler() {
	// Run the scheduler loop in a goroutine
	go func() {
		// Wait 1 minute on startup to allow the database connection to stabilize
		time.Sleep(1 * time.Minute)
		
		for {
			log.Println("[Scheduler] Running daily billing email check...")
			runBillingChecks()
			
			// Sleep for 24 hours before running the next check
			time.Sleep(24 * time.Hour)
		}
	}()
}

func runBillingChecks() {
	var settings models.GymSetting
	if err := database.DB.First(&settings).Error; err != nil {
		log.Println("[Scheduler] Gym settings not found, skipping email reminders.")
		return
	}

	if settings.SMTPHost == "" || settings.SMTPPassword == "" || settings.SMTPEmail == "" {
		log.Println("[Scheduler] SMTP email not configured, skipping email reminders.")
		return
	}

	var subscriptions []models.Subscription
	if err := database.DB.Preload("Member", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).Preload("Package").Preload("Discount").Find(&subscriptions).Error; err != nil {
		log.Println("[Scheduler] Failed to fetch subscriptions:", err)
		return
	}

	now := time.Now()
	var template models.MessageTemplate
	database.DB.Where("type = ?", "tagihan").First(&template)

	defaultTemplateText := "Halo {{nama}}, masa aktif langganan Anda akan berakhir pada {{jatuh_tempo}}."
	templateText := defaultTemplateText
	if template.ID != 0 {
		templateText = template.Content
	}

	sentCount := 0
	for _, sub := range subscriptions {
		// Skip disabled or inactive members, or members without email
		if sub.Status == "Expired" || sub.Status == "Disabled" || sub.Member.Status == "Disabled" || sub.Member.Email == "" {
			continue
		}

		// EndDate is time.Time. We calculate days left.
		due := sub.EndDate.Truncate(24 * time.Hour)
		today := now.Truncate(24 * time.Hour)
		daysLeft := int(due.Sub(today).Hours() / 24)

		// Send only 5 days before, and exactly on the due date (0 days)
		if daysLeft == 5 || daysLeft == 0 {
			hargaPaket := 0.0
			discountStr := "0"
			tagihan := 0.0

			if sub.PackageID != nil {
				hargaPaket = sub.Package.Price
				tagihan = hargaPaket
				
				if sub.DiscountID != nil && sub.Discount.ID != 0 {
					if sub.Discount.Type == "percentage" {
						potongan := hargaPaket * sub.Discount.Value / 100
						tagihan = hargaPaket - potongan
						discountStr = formatRupiahBillingScheduler(potongan)
					} else if sub.Discount.Type == "fixed" || sub.Discount.Type == "nominal" {
						tagihan = hargaPaket - sub.Discount.Value
						discountStr = formatRupiahBillingScheduler(sub.Discount.Value)
					}
					if tagihan < 0 {
						tagihan = 0
					}
				}
			}

			msgText := templateText
			msgText = strings.ReplaceAll(msgText, "{{nama}}", sub.Member.FullName)
			msgText = strings.ReplaceAll(msgText, "{{jatuh_tempo}}", sub.EndDate.Format("2006-01-02"))
			msgText = strings.ReplaceAll(msgText, "{{sisa_hari}}", fmt.Sprintf("%d", daysLeft))
			msgText = strings.ReplaceAll(msgText, "{{harga_paket}}", formatRupiahBillingScheduler(hargaPaket))
			msgText = strings.ReplaceAll(msgText, "{{discount}}", discountStr)
			msgText = strings.ReplaceAll(msgText, "{{tagihan}}", formatRupiahBillingScheduler(tagihan))
			msgText = strings.ReplaceAll(msgText, "{{tanggal}}", now.Format("2006-01-02"))
			msgText = strings.ReplaceAll(msgText, "{{id_member}}", sub.Member.MemberCode)

			emailSubject := ""
			if daysLeft == 5 {
				emailSubject = fmt.Sprintf("Pengingat Tagihan: 5 Hari Lagi Jatuh Tempo - %s", settings.Name)
			} else {
				emailSubject = fmt.Sprintf("Pengingat Tagihan: Hari Ini Jatuh Tempo - %s", settings.Name)
			}

			emailBody := fmt.Sprintf(`
			<html>
			<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 40px 10px;">
				<div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
					<h2 style="color: #2563eb; margin-top: 0; font-size: 24px; font-weight: bold; text-align: center;">Tagihan Iuran Langganan</h2>
					<div style="font-size: 16px; margin-top: 20px; white-space: pre-wrap; background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9;">%s</div>
					<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
					<p style="font-size: 12px; color: #94a3b8; text-align: center;">Pesan ini dikirim secara otomatis oleh sistem <strong>%s</strong>.</p>
				</div>
			</body>
			</html>
			`, strings.ReplaceAll(msgText, "\n", "<br/>"), settings.Name)

			err := utils.SendEmail(settings.SMTPHost, settings.SMTPPort, settings.SMTPEmail, settings.SMTPPassword, sub.Member.Email, emailSubject, emailBody)
			if err != nil {
				log.Printf("[Scheduler] Failed to send email to %s: %v\n", sub.Member.Email, err)
			} else {
				sentCount++
			}
		}
	}
	log.Printf("[Scheduler] Completed billing checks. Sent %d emails.\n", sentCount)
}

func formatRupiahBillingScheduler(amount float64) string {
	str := fmt.Sprintf("%.0f", amount)
	var result []byte
	for i := len(str) - 1; i >= 0; i-- {
		result = append([]byte{str[i]}, result...)
		if (len(str)-i)%3 == 0 && i != 0 && str[i-1] != '-' {
			result = append([]byte{'.'}, result...)
		}
	}
	return string(result)
}
