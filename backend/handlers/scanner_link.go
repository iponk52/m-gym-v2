package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"mgym-backend/database"
	"mgym-backend/models"

	"github.com/gofiber/fiber/v2"
)

// Generate a random hex string of 16 bytes (32 characters)
func generateSecretKey() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "fallback-secret-key" // should rarely happen
	}
	return hex.EncodeToString(bytes)
}

func GetScannerLinks(c *fiber.Ctx) error {
	var links []models.ScannerLink
	if err := database.DB.Order("created_at desc").Find(&links).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch scanner links"})
	}
	return c.JSON(links)
}

type CreateLinkRequest struct {
	Name string `json:"name"`
}

func CreateScannerLink(c *fiber.Ctx) error {
	var req CreateLinkRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
	}

	link := models.ScannerLink{
		Name:      req.Name,
		SecretKey: generateSecretKey(),
	}

	if err := database.DB.Create(&link).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create scanner link"})
	}

	LogActivity(c, "Create Scanner Link", "Created new scanner link: "+link.Name)

	return c.Status(201).JSON(link)
}

func DeleteScannerLink(c *fiber.Ctx) error {
	id := c.Params("id")

	var link models.ScannerLink
	if err := database.DB.First(&link, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Scanner link not found"})
	}

	if err := database.DB.Delete(&link).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete scanner link"})
	}

	LogActivity(c, "Delete Scanner Link", "Deleted scanner link: "+link.Name)

	return c.JSON(fiber.Map{"message": "Scanner link deleted successfully"})
}

func ValidateScannerLink(c *fiber.Ctx) error {
	secret := c.Params("secret")
	var link models.ScannerLink
	
	if err := database.DB.Where("secret_key = ?", secret).First(&link).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Invalid or expired scanner link"})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "Valid scanner link",
		"name":    link.Name,
	})
}
