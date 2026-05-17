package handlers

import (
	"mgym-backend/database"
	"mgym-backend/models"

	"github.com/gofiber/fiber/v2"
)

func CreatePaymentMethod(c *fiber.Ctx) error {
	var pm models.PaymentMethod
	if err := c.BodyParser(&pm); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := database.DB.Create(&pm).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create payment method"})
	}

	LogActivity(c, "Create Payment Method", "Created new payment method: "+pm.Name)

	return c.Status(201).JSON(pm)
}

func GetPaymentMethods(c *fiber.Ctx) error {
	var pms []models.PaymentMethod
	if err := database.DB.Find(&pms).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch payment methods"})
	}
	return c.JSON(pms)
}

func UpdatePaymentMethod(c *fiber.Ctx) error {
	id := c.Params("id")
	var pm models.PaymentMethod

	if err := database.DB.First(&pm, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Payment method not found"})
	}

	var req models.PaymentMethod
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	pm.Name = req.Name
	pm.AccountName = req.AccountName
	pm.AccountNumber = req.AccountNumber
	pm.Icon = req.Icon

	if err := database.DB.Save(&pm).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update payment method"})
	}

	LogActivity(c, "Update Payment Method", "Updated payment method: "+pm.Name)

	return c.JSON(pm)
}

func DeletePaymentMethod(c *fiber.Ctx) error {
	id := c.Params("id")
	var pm models.PaymentMethod

	if err := database.DB.First(&pm, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Payment method not found"})
	}

	if err := database.DB.Delete(&pm).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete payment method"})
	}

	LogActivity(c, "Delete Payment Method", "Deleted payment method: "+pm.Name)

	return c.JSON(fiber.Map{"message": "Payment method deleted successfully"})
}
