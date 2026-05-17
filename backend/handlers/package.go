package handlers

import (
	"mgym-backend/database"
	"mgym-backend/models"

	"github.com/gofiber/fiber/v2"
)

func CreatePackage(c *fiber.Ctx) error {
	var pkg models.Package
	if err := c.BodyParser(&pkg); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}
	if err := database.DB.Create(&pkg).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create package"})
	}

	LogActivity(c, "Create Package", "Created new package: "+pkg.Name)

	return c.Status(201).JSON(pkg)
}

func GetPackages(c *fiber.Ctx) error {
	var packages []models.Package
	if err := database.DB.Find(&packages).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch packages"})
	}
	return c.JSON(packages)
}

func UpdatePackage(c *fiber.Ctx) error {
	id := c.Params("id")
	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Package not found"})
	}

	var req models.Package
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	pkg.Name = req.Name
	pkg.Description = req.Description
	pkg.Price = req.Price

	database.DB.Save(&pkg)

	LogActivity(c, "Update Package", "Updated package: "+pkg.Name)

	return c.JSON(pkg)
}

func DeletePackage(c *fiber.Ctx) error {
	id := c.Params("id")
	var pkg models.Package
	if err := database.DB.First(&pkg, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Package not found"})
	}

	if err := database.DB.Delete(&pkg).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete package"})
	}

	LogActivity(c, "Delete Package", "Deleted package: "+pkg.Name)

	return c.JSON(fiber.Map{"message": "Package deleted"})
}
