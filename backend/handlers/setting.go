package handlers

import (
	"fmt"
	"mgym-backend/database"
	"mgym-backend/models"
	"mgym-backend/utils"
	"os"
	"time"

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
	setting.SMTPHost = req.SMTPHost
	setting.SMTPPort = req.SMTPPort
	setting.SMTPEmail = req.SMTPEmail
	setting.SMTPPassword = req.SMTPPassword

	if req.HeroTitle != "" {
		setting.HeroTitle = req.HeroTitle
	}
	if req.HeroSubtitle != "" {
		setting.HeroSubtitle = req.HeroSubtitle
	}
	if req.SiteAddress != "" {
		setting.SiteAddress = req.SiteAddress
	}

	if err := database.DB.Save(&setting).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan ke database: " + err.Error()})
	}
	fmt.Printf("[UpdateSettings] saved settings successfully: %+v\n", setting)

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

	logoURL := fmt.Sprintf("%s/uploads/gym_logo_%s", c.BaseURL(), file.Filename)
	setting.LogoURL = logoURL
	database.DB.Save(&setting)

	LogActivity(c, "Upload Logo", "Uploaded new gym logo")

	return c.JSON(fiber.Map{"message": "Logo uploaded successfully", "logo_url": logoURL})
}

type TestSMTPRequest struct {
	SMTPHost     string `json:"smtp_host"`
	SMTPPort     int    `json:"smtp_port"`
	SMTPEmail    string `json:"smtp_email"`
	SMTPPassword string `json:"smtp_password"`
	TestEmail    string `json:"test_email"`
}

func TestSMTPSettings(c *fiber.Ctx) error {
	var req TestSMTPRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if req.SMTPHost == "" || req.SMTPEmail == "" || req.SMTPPassword == "" || req.TestEmail == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Semua field SMTP dan Email Penerima wajib diisi."})
	}

	subject := "Test Koneksi SMTP - M-GYM"
	body := fmt.Sprintf(`
	<html>
	<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 40px 10px;">
		<div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
			<h2 style="color: #2563eb; margin-top: 0; font-size: 24px; font-weight: bold; text-align: center;">Koneksi SMTP Berhasil!</h2>
			<p style="font-size: 16px; margin-top: 20px;">Selamat!</p>
			<p style="font-size: 16px;">Konfigurasi SMTP email Anda di sistem <strong>M-GYM</strong> telah berhasil terhubung dan dapat mengirimkan email dengan sukses.</p>
			<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
			<p style="font-size: 12px; color: #94a3b8; text-align: center;">Email uji coba dikirim pada: %s</p>
		</div>
	</body>
	</html>
	`, time.Now().Format("2006-01-02 15:04:05"))

	err := utils.SendEmail(req.SMTPHost, req.SMTPPort, req.SMTPEmail, req.SMTPPassword, req.TestEmail, subject, body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Koneksi SMTP gagal: %v", err)})
	}

	LogActivity(c, "Test SMTP", "Successfully tested SMTP configuration to: "+req.TestEmail)

	return c.JSON(fiber.Map{"message": "Koneksi SMTP berhasil! Email uji coba telah terkirim."})
}
