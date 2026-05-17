package handlers

import (
	"mgym-backend/database"
	"mgym-backend/models"

	"github.com/gofiber/fiber/v2"
)

func CreateTemplate(c *fiber.Ctx) error {
	var t models.MessageTemplate
	if err := c.BodyParser(&t); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := database.DB.Create(&t).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create template"})
	}
	LogActivity(c, "Create Template", "Created new message template: "+t.Title)
	return c.JSON(t)
}

func GetTemplates(c *fiber.Ctx) error {
	var templates []models.MessageTemplate
	database.DB.Find(&templates)
	return c.JSON(templates)
}

func UpdateTemplate(c *fiber.Ctx) error {
	id := c.Params("id")
	var t models.MessageTemplate
	if err := database.DB.First(&t, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Template not found"})
	}

	var updateData models.MessageTemplate
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	t.Title = updateData.Title
	t.Content = updateData.Content
	t.Type = updateData.Type

	database.DB.Save(&t)
	LogActivity(c, "Update Template", "Updated message template: "+t.Title)
	return c.JSON(t)
}

func DeleteTemplate(c *fiber.Ctx) error {
	id := c.Params("id")
	var t models.MessageTemplate
	if err := database.DB.First(&t, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Template not found"})
	}
	database.DB.Delete(&t)
	LogActivity(c, "Delete Template", "Deleted message template: "+t.Title)
	return c.JSON(fiber.Map{"message": "Template deleted"})
}
