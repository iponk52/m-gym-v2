package handlers

import (
	"fmt"
	"mgym-backend/database"
	"mgym-backend/models"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
)

func CreateArticle(c *fiber.Ctx) error {
	var article models.Article
	if err := c.BodyParser(&article); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := database.DB.Create(&article).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create article"})
	}

	LogActivity(c, "Create Article", "Created new article: "+article.Title)

	return c.Status(201).JSON(article)
}

func GetArticles(c *fiber.Ctx) error {
	var articles []models.Article
	if err := database.DB.Order("created_at desc").Find(&articles).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch articles"})
	}
	return c.JSON(articles)
}

func GetArticleByID(c *fiber.Ctx) error {
	id := c.Params("id")
	var article models.Article
	if err := database.DB.First(&article, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Article not found"})
	}
	return c.JSON(article)
}

func UpdateArticle(c *fiber.Ctx) error {
	id := c.Params("id")
	var article models.Article
	if err := database.DB.First(&article, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Article not found"})
	}

	var req models.Article
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	article.Title = req.Title
	article.Content = req.Content
	article.CoverURL = req.CoverURL
	article.Author = req.Author

	if err := database.DB.Save(&article).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update article"})
	}

	LogActivity(c, "Update Article", "Updated article: "+article.Title)

	return c.JSON(article)
}

func DeleteArticle(c *fiber.Ctx) error {
	id := c.Params("id")
	var article models.Article
	if err := database.DB.First(&article, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Article not found"})
	}

	if err := database.DB.Delete(&article).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete article"})
	}

	LogActivity(c, "Delete Article", "Deleted article: "+article.Title)

	return c.JSON(fiber.Map{"message": "Article deleted"})
}

func UploadArticleImage(c *fiber.Ctx) error {
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Failed to upload image"})
	}

	os.MkdirAll("./uploads/articles", os.ModePerm)

	filename := fmt.Sprintf("./uploads/articles/%d_%s", time.Now().Unix(), file.Filename)
	if err := c.SaveFile(file, filename); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save image"})
	}

	imageURL := fmt.Sprintf("%s/uploads/articles/%d_%s", c.BaseURL(), time.Now().Unix(), file.Filename)

	return c.JSON(fiber.Map{"url": imageURL})
}
