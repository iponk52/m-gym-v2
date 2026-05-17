package handlers

import (
	"mgym-backend/database"
	"mgym-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ScanRequest struct {
	QRCode string `json:"qr_code"`
}

func ScanAttendance(c *fiber.Ctx) error {
	var req ScanRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.QRCode == "" {
		return c.Status(400).JSON(fiber.Map{"error": "QR Code is required"})
	}

	// 1. Find Member by QR Code
	var member models.Member
	if err := database.DB.Where("qr_code = ?", req.QRCode).First(&member).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// 2. Check if there is an open Attendance for today (Check-Out)
	var openAttendance models.Attendance
	err := database.DB.Where("member_id = ? AND check_in_time >= ? AND check_out_time IS NULL", member.ID, todayStart).First(&openAttendance).Error

	if err == nil {
		// Found open attendance -> Perform Check-Out (Always allowed)
		openAttendance.CheckOutTime = &now
		if err := database.DB.Save(&openAttendance).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to check-out"})
		}
		LogActivity(c, "Check-Out", "Member checked out: "+member.FullName)
		return c.Status(200).JSON(fiber.Map{
			"message": "Check-out successful",
			"member":  member.FullName,
			"time":    now.Format("15:04:05"),
		})
	}

	// 3. No open attendance -> Check Subscription Status before allowing Check-In
	var sub models.Subscription
	errSub := database.DB.Where("member_id = ?", member.ID).Order("end_date desc").First(&sub).Error

	// If no subscription found, or subscription end date is in the past, block Check-In
	if errSub != nil || sub.EndDate.Before(now) {
		dateStr := "Tidak diketahui"
		if errSub == nil {
			dateStr = sub.EndDate.Format("02-01-2006")
			// Update status to Overdue if it's already past the end date and not yet updated
			if sub.Status != "Overdue" && sub.Status != "Expired" {
				sub.Status = "Overdue"
				database.DB.Save(&sub)
			}
		}

		return c.Status(403).JSON(fiber.Map{
			"error":  "Status member inactive pada tanggal " + dateStr,
			"member": member,
		})
	}

	// 4. Subscription is active -> Perform Check-In
	newAttendance := models.Attendance{
		MemberID:    member.ID,
		CheckInTime: now,
	}
	if err := database.DB.Create(&newAttendance).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to check-in"})
	}

	LogActivity(c, "Check-In", "Member checked in: "+member.FullName)

	return c.Status(200).JSON(fiber.Map{
		"message": "Check-in successful",
		"member":  member.FullName,
		"time":    now.Format("15:04:05"),
	})
}

func GetAttendanceHistory(c *fiber.Ctx) error {
	var attendances []models.Attendance
	if err := database.DB.Preload("Member", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).Order("check_in_time desc").Find(&attendances).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch attendance history"})
	}
	return c.JSON(attendances)
}
