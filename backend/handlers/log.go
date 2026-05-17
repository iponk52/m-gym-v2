package handlers

import (
	"mgym-backend/database"
	"mgym-backend/models"

	"github.com/gofiber/fiber/v2"
)

// Helper function to log activities
func LogActivity(c *fiber.Ctx, action, details string) {
	actor := c.Get("X-Username")
	if actor == "" {
		actor = "System"
	}
	role := c.Get("X-User-Role")
	if role == "" {
		role = "System"
	}
	ip := c.Get("CF-Connecting-IP")
	if ip == "" {
		ip = c.Get("X-Forwarded-For")
	}
	if ip == "" {
		ip = c.Get("X-Real-IP")
	}
	if ip == "" {
		ip = c.IP()
	}

	logEntry := models.AuditLog{
		Actor:     actor,
		Role:      role,
		IPAddress: ip,
		Action:    action,
		Details:   details,
	}
	database.DB.Create(&logEntry)
}

func GetLogs(c *fiber.Ctx) error {
	var logs []models.AuditLog
	if err := database.DB.Order("created_at desc").Limit(100).Find(&logs).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch logs"})
	}
	return c.JSON(logs)
}
