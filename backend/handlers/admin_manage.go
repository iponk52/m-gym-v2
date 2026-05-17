package handlers

import (
	"mgym-backend/database"
	"mgym-backend/models"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func GetAdmins(c *fiber.Ctx) error {
	var admins []models.Admin
	if err := database.DB.Find(&admins).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch admins"})
	}
	return c.JSON(admins)
}

func CreateAdmin(c *fiber.Ctx) error {
	type Request struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	admin := models.Admin{
		Username: req.Username,
		Password: string(hashedPassword),
		Role:     "admin",
	}

	if err := database.DB.Create(&admin).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Username already exists or failed to create"})
	}

	LogActivity(c, "Create Admin", "Created new admin account: "+req.Username)

	return c.JSON(fiber.Map{"message": "Admin created successfully", "admin": admin})
}

func UpdateAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	type Request struct {
		Username string `json:"username"`
		Password string `json:"password"` // optional
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	var admin models.Admin
	if err := database.DB.First(&admin, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Admin not found"})
	}

	admin.Username = req.Username
	if req.Password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
		admin.Password = string(hashedPassword)
	}

	if err := database.DB.Save(&admin).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update admin"})
	}

	LogActivity(c, "Update Admin", "Updated admin account ID: "+id)

	return c.JSON(fiber.Map{"message": "Admin updated successfully"})
}

func DeleteAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	var admin models.Admin
	if err := database.DB.First(&admin, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Admin not found"})
	}

	// Prevent deleting the last admin
	var count int64
	database.DB.Model(&models.Admin{}).Count(&count)
	if count <= 1 {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot delete the last admin account"})
	}

	if err := database.DB.Delete(&admin).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete admin"})
	}

	LogActivity(c, "Delete Admin", "Deleted admin account: "+admin.Username)

	return c.JSON(fiber.Map{"message": "Admin deleted successfully"})
}
