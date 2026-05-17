package handlers

import (
	"mgym-backend/database"
	"mgym-backend/models"

	"github.com/gofiber/fiber/v2"
)

func CreateDiscount(c *fiber.Ctx) error {
	var d models.Discount
	if err := c.BodyParser(&d); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := database.DB.Create(&d).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create discount"})
	}

	LogActivity(c, "Create Discount", "Created new discount: "+d.Name)

	return c.JSON(d)
}

func GetDiscounts(c *fiber.Ctx) error {
	var discounts []models.Discount
	database.DB.Find(&discounts)
	return c.JSON(discounts)
}

func UpdateDiscount(c *fiber.Ctx) error {
	id := c.Params("id")
	var d models.Discount
	if err := database.DB.First(&d, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Discount not found"})
	}

	var updateData models.Discount
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	d.Name = updateData.Name
	d.Description = updateData.Description
	d.Type = updateData.Type
	d.Value = updateData.Value

	database.DB.Save(&d)

	LogActivity(c, "Update Discount", "Updated discount: "+d.Name)

	return c.JSON(d)
}

func DeleteDiscount(c *fiber.Ctx) error {
	id := c.Params("id")
	
	var d models.Discount
	if err := database.DB.First(&d, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Discount not found"})
	}

	database.DB.Delete(&d)

	LogActivity(c, "Delete Discount", "Deleted discount: "+d.Name)

	return c.JSON(fiber.Map{"message": "Discount deleted"})
}
