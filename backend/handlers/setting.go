package handlers

import (
	"fmt"
	"mgym-backend/database"
	"mgym-backend/models"
	"os"

	"github.com/gofiber/fiber/v2"
)

// GetSettings fetches the single GymSetting record. If none exists, creates a default one.
func GetSettings(c *fiber.Ctx) error {
	var setting models.GymSetting
	err := database.DB.First(&setting).Error
	if err != nil {
		// If not found, create a default setting
		setting = models.GymSetting{
			Name:    "M-GYM",
			Address: "Jl. Contoh Alamat No. 123",
			About:   "Pusat kebugaran terbaik di kota Anda.",
			Email:   "info@mgym.com",
			Phone:   "08123456789",
		}
		database.DB.Create(&setting)
	}

	return c.JSON(setting)
}

// UpdateSettings updates the text fields of GymSetting
func UpdateSettings(c *fiber.Ctx) error {
	var setting models.GymSetting
	if err := database.DB.First(&setting).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Settings not found"})
	}

	var req models.GymSetting
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	setting.Name = req.Name
	setting.Address = req.Address
	setting.About = req.About
	setting.Email = req.Email
	setting.Phone = req.Phone

	if req.HeroTitle != "" {
		setting.HeroTitle = req.HeroTitle
	}
	if req.HeroSubtitle != "" {
		setting.HeroSubtitle = req.HeroSubtitle
	}

	database.DB.Save(&setting)

	LogActivity(c, "Update Settings", "Updated gym settings")

	return c.JSON(fiber.Map{"message": "Settings updated successfully", "setting": setting})
}

// UploadGymLogo handles image upload for the gym logo
func UploadGymLogo(c *fiber.Ctx) error {
	var setting models.GymSetting
	if err := database.DB.First(&setting).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Settings not found"})
	}

	file, err := c.FormFile("logo")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Failed to upload logo"})
	}

	os.MkdirAll("./uploads", os.ModePerm)

	filename := fmt.Sprintf("./uploads/gym_logo_%s", file.Filename)
	if err := c.SaveFile(file, filename); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save logo"})
	}

	logoURL := fmt.Sprintf("http://localhost:3000/uploads/gym_logo_%s", file.Filename)
	setting.LogoURL = logoURL
	database.DB.Save(&setting)

	LogActivity(c, "Upload Logo", "Uploaded new gym logo")

	return c.JSON(fiber.Map{"message": "Logo uploaded successfully", "logo_url": logoURL})
}
