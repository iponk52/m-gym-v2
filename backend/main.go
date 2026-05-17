package main

import (
	"fmt"
	"log"
	"mgym-backend/database"
	"mgym-backend/models"
	"mgym-backend/routes"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found or error reading it")
	}

	database.Connect()

	// Auto-create default admin
	var count int64
	database.DB.Model(&models.Admin{}).Count(&count)
	if count == 0 {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), 10)
		admin := models.Admin{
			Username: "admin",
			Password: string(hashedPassword),
			Role:     "admin",
		}
		database.DB.Create(&admin)
		log.Println("Default admin created: admin / admin123")
	}

	// Backfill MemberCode for existing members
	var members []models.Member
	database.DB.Where("member_code = ? OR member_code IS NULL", "").Find(&members)
	for _, m := range members {
		m.MemberCode = fmt.Sprintf("GYM-%s-%03d", m.DOB.Format("020106"), m.ID)
		database.DB.Save(&m)
	}
	if len(members) > 0 {
		log.Printf("Backfilled MemberCode for %d existing members\n", len(members))
	}

	app := fiber.New()

	app.Use(logger.New())
	app.Use(cors.New())

	// Serve uploads folder statically
	app.Static("/uploads", "./uploads")

	// Setup routes
	routes.SetupRoutes(app)

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("M-GYM API is running")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
