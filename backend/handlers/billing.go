package handlers

import (
	"fmt"
	"mgym-backend/database"
	"mgym-backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func formatRupiahBilling(amount float64) string {
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

func GetBillingStatus(c *fiber.Ctx) error {
	var subscriptions []models.Subscription

	// Preload the Member, Package, and Discount data
	if err := database.DB.Preload("Member", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).Preload("Package").Preload("Discount").Find(&subscriptions).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch subscriptions"})
	}

	var nearExpiry []fiber.Map
	var overdue []fiber.Map

	now := time.Now()

	// Initialize empty arrays instead of null in JSON response
	nearExpiry = make([]fiber.Map, 0)
	overdue = make([]fiber.Map, 0)

	for _, sub := range subscriptions {
		if sub.Status == "Expired" || sub.Status == "Disabled" || sub.Member.Status == "Disabled" {
			continue
		}

		daysLeft := int(sub.EndDate.Sub(now).Hours() / 24)

		if daysLeft < -60 {
			if sub.Status != "Disabled" {
				sub.Status = "Disabled"
				database.DB.Save(&sub)
			}
			if sub.Member.Status != "Disabled" {
				sub.Member.Status = "Disabled"
				database.DB.Save(&sub.Member)
			}
			continue
		}

		hargaPaket := 0.0
		discountFloat := 0.0
		tagihan := 0.0

		if sub.PackageID != nil {
			hargaPaket = sub.Package.Price
			tagihan = hargaPaket
			
			if sub.DiscountID != nil && sub.Discount.ID != 0 {
				if sub.Discount.Type == "percentage" {
					potongan := hargaPaket * sub.Discount.Value / 100
					tagihan = hargaPaket - potongan
					discountFloat = potongan
				} else if sub.Discount.Type == "fixed" || sub.Discount.Type == "nominal" {
					tagihan = hargaPaket - sub.Discount.Value
					discountFloat = sub.Discount.Value
				}
				if tagihan < 0 {
					tagihan = 0
				}
			}
		}

		if daysLeft < 0 {
			if sub.Status != "Overdue" {
				sub.Status = "Overdue"
				database.DB.Save(&sub)
			}
			overdue = append(overdue, fiber.Map{
				"subscription_id": sub.ID,
				"member_name":     sub.Member.FullName,
				"member_phone":    sub.Member.Phone,
				"end_date":        sub.EndDate.Format("2006-01-02"),
				"days_overdue":    -daysLeft,
				"package_price":   hargaPaket,
				"discount_amount": discountFloat,
				"total_bill":      tagihan,
			})
		} else if daysLeft <= 5 {
			nearExpiry = append(nearExpiry, fiber.Map{
				"subscription_id": sub.ID,
				"member_name":     sub.Member.FullName,
				"member_phone":    sub.Member.Phone,
				"end_date":        sub.EndDate.Format("2006-01-02"),
				"days_left":       daysLeft,
				"package_price":   hargaPaket,
				"discount_amount": discountFloat,
				"total_bill":      tagihan,
			})
		}
	}

	return c.JSON(fiber.Map{
		"near_expiry": nearExpiry,
		"overdue":     overdue,
	})
}

func SendManualBilling(c *fiber.Ctx) error {
	id := c.Params("id")

	var sub models.Subscription
	if err := database.DB.Preload("Member", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).Preload("Package").Preload("Discount").First(&sub, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Subscription not found"})
	}

	var template models.MessageTemplate
	database.DB.Where("type = ?", "tagihan").First(&template)

	msgText := "Halo {{nama}}, masa aktif langganan Anda akan berakhir pada {{jatuh_tempo}}."
	if template.ID != 0 {
		msgText = template.Content
	}

	daysLeft := int(sub.EndDate.Sub(time.Now()).Hours() / 24)

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
				discountStr = formatRupiahBilling(potongan)
			} else if sub.Discount.Type == "fixed" || sub.Discount.Type == "nominal" {
				tagihan = hargaPaket - sub.Discount.Value
				discountStr = formatRupiahBilling(sub.Discount.Value)
			}
			
			if tagihan < 0 {
				tagihan = 0
			}
		}
	}

	msgText = strings.ReplaceAll(msgText, "{{nama}}", sub.Member.FullName)
	msgText = strings.ReplaceAll(msgText, "{{jatuh_tempo}}", sub.EndDate.Format("2006-01-02"))
	msgText = strings.ReplaceAll(msgText, "{{sisa_hari}}", fmt.Sprintf("%d", daysLeft))
	msgText = strings.ReplaceAll(msgText, "{{harga_paket}}", formatRupiahBilling(hargaPaket))
	msgText = strings.ReplaceAll(msgText, "{{discount}}", discountStr)
	msgText = strings.ReplaceAll(msgText, "{{tagihan}}", formatRupiahBilling(tagihan))
	msgText = strings.ReplaceAll(msgText, "{{tanggal}}", time.Now().Format("2006-01-02"))
	msgText = strings.ReplaceAll(msgText, "{{id_member}}", sub.Member.MemberCode)

	LogActivity(c, "Send Billing Reminder", "Sent billing reminder to member: "+sub.Member.FullName)

	return c.JSON(fiber.Map{
		"message": "Template generated",
		"phone":   sub.Member.Phone,
		"text":    msgText,
		"status":  "success",
	})
}

func MarkAsPaid(c *fiber.Ctx) error {
	id := c.Params("id")

	var sub models.Subscription
	if err := database.DB.Preload("Package").Preload("Discount").First(&sub, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Subscription not found"})
	}

	oldEndDate := sub.EndDate

	// Selalu tambahkan 1 bulan dari EndDate sebelumnya agar tanggal tagihan tetap sama
	sub.EndDate = sub.EndDate.AddDate(0, 1, 0)
	sub.Status = "Active"

	database.DB.Save(&sub)

	// Create Payment record
	amount := 0.0
	if sub.PackageID != nil {
		amount = sub.Package.Price
		
		if sub.DiscountID != nil && sub.Discount.ID != 0 {
			if sub.Discount.Type == "percentage" {
				amount = amount - (amount * sub.Discount.Value / 100)
			} else if sub.Discount.Type == "fixed" || sub.Discount.Type == "nominal" {
				amount = amount - sub.Discount.Value
			}
			
			if amount < 0 {
				amount = 0
			}
		}
	}
	
	payment := models.Payment{
		SubscriptionID:  sub.ID,
		Amount:          amount,
		PaymentDate:     time.Now(),
		PreviousEndDate: &oldEndDate,
	}
	database.DB.Create(&payment)

	// Refresh member to get full name for log
	var mem models.Member
	database.DB.Unscoped().First(&mem, sub.MemberID)
	LogActivity(c, "Mark as Paid", "Confirmed payment for member: "+mem.FullName)

	return c.JSON(fiber.Map{
		"message":      "Subscription extended successfully",
		"subscription": sub,
		"payment":      payment,
	})
}

func GetBillingHistory(c *fiber.Ctx) error {
	var payments []models.Payment
	if err := database.DB.Preload("Subscription").Preload("Subscription.Member", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).Preload("Subscription.Package").Preload("Subscription.Discount").Order("payment_date desc").Find(&payments).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch payments"})
	}
	return c.JSON(payments)
}

func SendPaidReceipt(c *fiber.Ctx) error {
	paymentID := c.Params("id")

	var payment models.Payment
	if err := database.DB.Preload("Subscription").Preload("Subscription.Member", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).Preload("Subscription.Package").Preload("Subscription.Discount").First(&payment, paymentID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Payment not found"})
	}

	var template models.MessageTemplate
	database.DB.Where("type = ?", "lunas").First(&template)

	msgText := "Halo {{nama}}, terima kasih. Pembayaran Anda telah kami terima pada {{tanggal}}."
	if template.ID != 0 {
		msgText = template.Content
	}

	hargaPaket := 0.0
	discountStr := "0"
	tagihan := payment.Amount

	if payment.Subscription.PackageID != nil {
		hargaPaket = payment.Subscription.Package.Price
		
		if payment.Subscription.DiscountID != nil && payment.Subscription.Discount.ID != 0 {
			if payment.Subscription.Discount.Type == "percentage" {
				potongan := hargaPaket * payment.Subscription.Discount.Value / 100
				discountStr = formatRupiahBilling(potongan)
			} else if payment.Subscription.Discount.Type == "fixed" || payment.Subscription.Discount.Type == "nominal" {
				discountStr = formatRupiahBilling(payment.Subscription.Discount.Value)
			}
		}
	}

	msgText = strings.ReplaceAll(msgText, "{{nama}}", payment.Subscription.Member.FullName)
	msgText = strings.ReplaceAll(msgText, "{{nominal}}", formatRupiahBilling(payment.Amount))
	msgText = strings.ReplaceAll(msgText, "{{tanggal}}", time.Now().Format("2006-01-02"))
	msgText = strings.ReplaceAll(msgText, "{{harga_paket}}", formatRupiahBilling(hargaPaket))
	msgText = strings.ReplaceAll(msgText, "{{discount}}", discountStr)
	msgText = strings.ReplaceAll(msgText, "{{tagihan}}", formatRupiahBilling(tagihan))
	msgText = strings.ReplaceAll(msgText, "{{id_member}}", payment.Subscription.Member.MemberCode)

	return c.JSON(fiber.Map{
		"message": "Template generated",
		"phone":   payment.Subscription.Member.Phone,
		"text":    msgText,
		"status":  "success",
	})
}

func UndoPayment(c *fiber.Ctx) error {
	paymentID := c.Params("id")

	var payment models.Payment
	if err := database.DB.Preload("Subscription").First(&payment, paymentID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Payment not found"})
	}

	var sub models.Subscription
	if err := database.DB.First(&sub, payment.SubscriptionID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Subscription not found"})
	}

	// Revert the subscription date
	if payment.PreviousEndDate != nil {
		sub.EndDate = *payment.PreviousEndDate
	} else {
		sub.EndDate = sub.EndDate.AddDate(0, -1, 0)
	}

	// Re-evaluate the status
	now := time.Now()
	daysLeft := int(sub.EndDate.Sub(now).Hours() / 24)

	if daysLeft < 0 {
		sub.Status = "Overdue"
	} else {
		sub.Status = "Active"
	}

	database.DB.Save(&sub)
	database.DB.Delete(&payment)

	var mem models.Member
	database.DB.Unscoped().First(&mem, sub.MemberID)
	LogActivity(c, "Undo Payment", "Reverted payment for member: "+mem.FullName)

	return c.JSON(fiber.Map{
		"message":      "Payment undone successfully",
		"subscription": sub,
	})
}
