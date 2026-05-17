package handlers

import (
	"fmt"
	"mgym-backend/database"
	"mgym-backend/models"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

func init() {
	if len(jwtSecret) == 0 {
		jwtSecret = []byte("super-secret-key-for-mgym-2026")
	}
}

type LoginRequest struct {
	Username string `json:"username"` // Admin username atau Member Phone
	Password string `json:"password"`
	Role     string `json:"role"`     // "admin" atau "member"
}

func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Role == "admin" {
		var admin models.Admin
		if err := database.DB.Where("username = ?", req.Username).First(&admin).Error; err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		if err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(req.Password)); err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"id":   admin.ID,
			"role": "admin",
			"exp":  time.Now().Add(time.Hour * 24).Unix(),
		})

		t, err := token.SignedString(jwtSecret)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Could not login"})
		}

		c.Request().Header.Set("X-Username", admin.Username)
		c.Request().Header.Set("X-User-Role", "admin")
		LogActivity(c, "Login", "Admin login berhasil")

		return c.JSON(fiber.Map{"token": t, "role": "admin", "username": admin.Username})

	} else if req.Role == "member" {
		req.Username = strings.TrimSpace(req.Username)
		if strings.HasPrefix(req.Username, "0") {
			req.Username = "62" + req.Username[1:]
		}

		var member models.Member
		if err := database.DB.Where("phone = ?", req.Username).First(&member).Error; err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		if member.Status == "Disabled" {
			return c.Status(403).JSON(fiber.Map{"error": "Akun Anda telah dinonaktifkan."})
		}
		if member.Status == "Pending" {
			return c.Status(403).JSON(fiber.Map{"error": "Akun Anda belum disetujui oleh Admin."})
		}

		if err := bcrypt.CompareHashAndPassword([]byte(member.Password), []byte(req.Password)); err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"id":   member.ID,
			"role": "member",
			"exp":  time.Now().Add(time.Hour * 24 * 7).Unix(),
		})

		t, err := token.SignedString(jwtSecret)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Could not login"})
		}

		c.Request().Header.Set("X-Username", member.FullName)
		c.Request().Header.Set("X-User-Role", "member")
		LogActivity(c, "Login", "Member login berhasil")

		return c.JSON(fiber.Map{
			"token":                t,
			"role":                 "member",
			"member_id":            member.ID,
			"name":                 member.FullName,
			"must_change_password": member.MustChangePassword,
		})
	}

	return c.Status(400).JSON(fiber.Map{"error": "Invalid role"})
}

func Logout(c *fiber.Ctx) error {
	// Aksi logout
	LogActivity(c, "Logout", "Pengguna keluar dari sistem")
	return c.JSON(fiber.Map{"message": "Logout recorded"})
}

// Generate Admin pertama
func SetupAdmin(c *fiber.Ctx) error {
	var count int64
	database.DB.Model(&models.Admin{}).Count(&count)
	if count > 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Admin already exists"})
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), 10)
	admin := models.Admin{
		Username: "admin",
		Password: string(hashedPassword),
		Role:     "admin",
	}

	database.DB.Create(&admin)
	return c.JSON(fiber.Map{"message": "Admin created", "username": "admin", "password": "admin123"})
}

type ChangePasswordRequest struct {
	NewPassword string `json:"new_password"`
}

func ChangePasswordFirstLogin(c *fiber.Ctx) error {
	id := c.Params("id")
	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if req.NewPassword == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Password cannot be empty"})
	}

	var member models.Member
	if err := database.DB.First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 10)
	member.Password = string(hashedPassword)
	member.MustChangePassword = false

	if err := database.DB.Save(&member).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update password"})
	}

	return c.JSON(fiber.Map{"message": "Password updated successfully"})
}

func GenerateResetPasswordLink(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.Member
	if err := database.DB.First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":      member.ID,
		"purpose": "reset_password",
		"exp":     time.Now().Add(time.Hour * 1).Unix(), // 1 jam
	})

	t, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate reset link"})
	}

	resetLink := fmt.Sprintf("http://localhost:5173/reset-password?token=%s", t)
	
	var template models.MessageTemplate
	database.DB.Where("type = ?", "reset").First(&template)

	var settings models.GymSetting
	database.DB.First(&settings)

	msgText := fmt.Sprintf("Halo %s, silakan klik link berikut untuk melakukan reset password Anda: %s", member.FullName, resetLink)
	if template.ID != 0 {
		msgText = template.Content
		msgText = strings.ReplaceAll(msgText, "{{nama}}", member.FullName)
		msgText = strings.ReplaceAll(msgText, "{{link_reset}}", resetLink)
		msgText = strings.ReplaceAll(msgText, "{{nama_gym}}", settings.Name)
		msgText = strings.ReplaceAll(msgText, "{{id_member}}", member.MemberCode)
	}

	return c.JSON(fiber.Map{
		"message": "Reset link generated",
		"phone":   member.Phone,
		"text":    msgText,
		"status":  "success",
	})
}

type ResetPasswordPublicRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func ProcessResetPassword(c *fiber.Ctx) error {
	var req ResetPasswordPublicRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if req.NewPassword == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Password tidak boleh kosong"})
	}

	token, err := jwt.Parse(req.Token, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return c.Status(401).JSON(fiber.Map{"error": "Token tidak valid atau sudah kedaluwarsa"})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["purpose"] != "reset_password" {
		return c.Status(401).JSON(fiber.Map{"error": "Token tidak valid"})
	}

	memberID := uint(claims["id"].(float64))
	var member models.Member
	if err := database.DB.First(&member, memberID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member tidak ditemukan"})
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 10)
	member.Password = string(hashedPassword)
	member.MustChangePassword = false

	if err := database.DB.Save(&member).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan password baru"})
	}

	return c.JSON(fiber.Map{"message": "Password berhasil diperbarui! Silakan login."})
}
