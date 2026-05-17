package database

import (
	"fmt"
	"log"
	"os"

	"mgym-backend/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASS")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	name := os.Getenv("DB_NAME")

	driver := os.Getenv("DB_DRIVER")
	if driver == "" {
		driver = "mysql"
	}

	var err error

	if driver == "postgres" {
		// Postgres connection
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta", host, user, pass, name, port)
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			log.Fatal("Failed to connect to PostgreSQL database: \n", err)
			os.Exit(2)
		}
		log.Println("Connected to PostgreSQL Database successfully!")
	} else {
		// MySQL connection
		dsnNoDB := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local", user, pass, host, port)
		dbTemp, err := gorm.Open(mysql.Open(dsnNoDB), &gorm.Config{})
		if err != nil {
			log.Fatal("Failed to connect to MySQL server: \n", err)
		}

		createDBQuery := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s`;", name)
		dbTemp.Exec(createDBQuery)

		dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", user, pass, host, port, name)
		DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err != nil {
			log.Fatal("Failed to connect to database: \n", err)
			os.Exit(2)
		}
		log.Println("Connected to MySQL Database successfully!")
	}

	err = DB.AutoMigrate(&models.Admin{}, &models.Member{}, &models.Subscription{}, &models.Attendance{}, &models.MessageTemplate{}, &models.Discount{}, &models.Package{}, &models.Payment{}, &models.ScannerLink{}, &models.GymSetting{}, &models.PaymentMethod{}, &models.Article{}, &models.AuditLog{})
	if err != nil {
		log.Fatal("Failed to migrate database: \n", err)
	}
	log.Println("Database Migration Completed!")

	// Seeder for initial run
	var adminCount int64
	DB.Model(&models.Admin{}).Count(&adminCount)
	if adminCount == 0 {
		adminUser := os.Getenv("DEFAULT_ADMIN_USER")
		if adminUser == "" {
			adminUser = "admin"
		}
		adminPass := os.Getenv("DEFAULT_ADMIN_PASS")
		if adminPass == "" {
			adminPass = "admin123"
		}

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(adminPass), bcrypt.DefaultCost)
		admin := models.Admin{
			Username: adminUser,
			Password: string(hashedPassword),
			Role:     "admin",
		}
		DB.Create(&admin)
		log.Printf("Default admin user created: %s / %s\n", adminUser, adminPass)
	}

	var settingCount int64
	DB.Model(&models.GymSetting{}).Count(&settingCount)
	if settingCount == 0 {
		setting := models.GymSetting{
			Name: "ME-GYM",
			Address: "Jl. Contoh Alamat No. 123",
			About: "Pusat kebugaran terbaik di kota Anda.",
			Email: "info@mgym.com",
			Phone: "08123456789",
		}
		DB.Create(&setting)
		log.Println("Default gym settings created")
	}
}
