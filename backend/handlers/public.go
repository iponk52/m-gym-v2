package handlers

import (
	"fmt"
	"mgym-backend/database"
	"mgym-backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func GetPublicHomeData(c *fiber.Ctx) error {
	var settings models.GymSetting
	database.DB.First(&settings)

	var articles []models.Article
	database.DB.Order("created_at desc").Limit(6).Find(&articles)

	var packages []models.Package
	database.DB.Find(&packages)

	return c.JSON(fiber.Map{
		"settings": settings,
		"articles": articles,
		"packages": packages,
	})
}

type PublicRegisterRequest struct {
	FullName  string `json:"full_name"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	DOB       string `json:"dob"`
	Address   string `json:"address"`
	PackageID *uint  `json:"package_id"`
}

func RegisterPublic(c *fiber.Ctx) error {
	var req PublicRegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Phone = strings.TrimSpace(req.Phone)
	if strings.HasPrefix(req.Phone, "0") {
		req.Phone = "62" + req.Phone[1:]
	}

	var dob time.Time
	if req.DOB != "" {
		parsedDob, err := time.Parse("2006-01-02", req.DOB)
		if err == nil {
			dob = parsedDob
		}
	}

	// Validasi duplikasi Nama, Phone, dan Email
	var count int64
	database.DB.Model(&models.Member{}).Where("phone = ?", req.Phone).Count(&count)
	if count > 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Nomor telepon sudah terdaftar"})
	}

	if req.Email != "" {
		database.DB.Model(&models.Member{}).Where("email = ?", req.Email).Count(&count)
		if count > 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Alamat email sudah terdaftar"})
		}
	}

	// Gunakan tanggal lahir (DOB) sebagai password bawaan (format DDMMYY)
	passwordStr := req.DOB
	if passwordStr != "" {
		t, err := time.Parse("2006-01-02", passwordStr)
		if err == nil {
			passwordStr = t.Format("020106")
		}
	}
	if passwordStr == "" {
		passwordStr = req.Phone // Fallback ke phone jika kosong
	}
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(passwordStr), 10)
	qrString := fmt.Sprintf("MGYM-%s-%d", req.Phone, time.Now().Unix())

	member := models.Member{
		FullName: req.FullName,
		Phone:    req.Phone,
		Email:    req.Email,
		Address:  req.Address,
		DOB:      dob,
		Password: string(hashedPassword),
		QRCode:   qrString,
		Status:   "Pending",
	}

	if err := database.DB.Create(&member).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan data", "details": err.Error()})
	}

	member.MemberCode = fmt.Sprintf("GYM-%s-%03d", dob.Format("020106"), member.ID)
	database.DB.Save(&member)

	if req.PackageID != nil {
		sub := models.Subscription{
			MemberID:  member.ID,
			PackageID: req.PackageID,
			Status:    "Pending",
			StartDate: time.Now(),
			EndDate:   time.Now(), // Nanti diupdate waktu di-ACC
		}
		database.DB.Create(&sub)
	}

	return c.Status(201).JSON(fiber.Map{
		"message": "Registrasi berhasil, menunggu ACC admin",
		"member":  member,
	})
}

func CheckDuplicate(c *fiber.Ctx) error {
	field := c.Query("field")
	value := c.Query("value")

	if field == "" || value == "" {
		return c.JSON(fiber.Map{"exists": false})
	}

	value = strings.TrimSpace(value)
	if field == "phone" && strings.HasPrefix(value, "0") {
		value = "62" + value[1:]
	}

	var count int64
	switch field {
	case "phone":
		database.DB.Model(&models.Member{}).Where("phone = ?", value).Count(&count)
	case "email":
		database.DB.Model(&models.Member{}).Where("email = ?", value).Count(&count)
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Invalid field"})
	}

	return c.JSON(fiber.Map{"exists": count > 0})
}

type ForgotPasswordCheckReq struct {
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
}

func ForgotPasswordCheck(c *fiber.Ctx) error {
	var req ForgotPasswordCheckReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	req.Phone = strings.TrimSpace(req.Phone)
	if strings.HasPrefix(req.Phone, "0") {
		req.Phone = "62" + req.Phone[1:]
	}

	var member models.Member
	if err := database.DB.Where("phone = ? AND full_name ILIKE ?", req.Phone, "%"+req.FullName+"%").First(&member).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member tidak ditemukan. Pastikan nama dan no telp sesuai dengan yang terdaftar."})
	}

	var settings models.GymSetting
	database.DB.First(&settings)

	msgText := fmt.Sprintf("hallo %s, user saya %s dengan no telp : %s lupa password", settings.Name, member.FullName, member.Phone)

	return c.JSON(fiber.Map{
		"admin_phone": settings.Phone,
		"text": msgText,
	})
}
