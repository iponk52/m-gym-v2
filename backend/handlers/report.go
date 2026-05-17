package handlers

import (
	"mgym-backend/database"
	"mgym-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func GetReport(c *fiber.Ctx) error {
	reportType := c.Query("type") // "members", "visitors", "billing"
	startDateStr := c.Query("start")
	endDateStr := c.Query("end")

	if reportType == "" || startDateStr == "" || endDateStr == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Missing required query parameters"})
	}

	// Parse dates
	layout := "2006-01-02"
	startDate, err := time.Parse(layout, startDateStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid start date format"})
	}
	endDate, err := time.Parse(layout, endDateStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid end date format"})
	}

	// Sesuaikan endDate agar mencakup seluruh hari tersebut (hingga 23:59:59)
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	switch reportType {
	case "members":
		var members []models.Member
		if err := database.DB.Where("created_at >= ? AND created_at <= ?", startDate, endDate).Order("created_at desc").Find(&members).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch member reports"})
		}
		return c.JSON(members)

	case "visitors":
		var attendances []models.Attendance
		if err := database.DB.Preload("Member", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).Where("check_in_time >= ? AND check_in_time <= ?", startDate, endDate).Order("check_in_time desc").Find(&attendances).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch visitor reports"})
		}
		return c.JSON(attendances)

	case "billing":
		var payments []models.Payment
		if err := database.DB.Preload("Subscription").Preload("Subscription.Member").Preload("Subscription.Package").Where("payment_date >= ? AND payment_date <= ?", startDate, endDate).Order("payment_date desc").Find(&payments).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch billing reports"})
		}
		return c.JSON(payments)

	default:
		return c.Status(400).JSON(fiber.Map{"error": "Unknown report type"})
	}
}
