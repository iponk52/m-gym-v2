package handlers

import (
	"fmt"
	"mgym-backend/database"
	"mgym-backend/models"
	"mgym-backend/utils"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
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

func censorEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return email
	}
	username := parts[0]
	domain := parts[1]
	if len(username) <= 2 {
		return username + "***@" + domain
	}
	return string(username[0]) + "***" + string(username[len(username)-1]) + "@" + domain
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

	if member.Email == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Email Anda belum terdaftar di sistem. Silakan hubungi admin via WhatsApp untuk mendaftarkannya."})
	}

	var settings models.GymSetting
	database.DB.First(&settings)

	if settings.SMTPHost == "" || settings.SMTPPassword == "" || settings.SMTPEmail == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Layanan email (SMTP) belum dikonfigurasi oleh Admin. Silakan hubungi Admin via WhatsApp."})
	}

	// Generate JWT reset password token (valid for 1 hour)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":      member.ID,
		"purpose": "reset_password",
		"exp":     time.Now().Add(time.Hour * 1).Unix(),
	})

	t, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal membuat link reset password"})
	}

	siteAddr := settings.SiteAddress
	if siteAddr == "" {
		siteAddr = "http://localhost:5173"
	}
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", siteAddr, t)

	var template models.MessageTemplate
	database.DB.Where("type = ?", "reset").First(&template)

	emailSubject := fmt.Sprintf("Reset Password Akun - %s", settings.Name)
	if template.ID != 0 && template.Title != "" {
		emailSubject = template.Title
		emailSubject = strings.ReplaceAll(emailSubject, "{{nama}}", member.FullName)
		emailSubject = strings.ReplaceAll(emailSubject, "{{nama_gym}}", settings.Name)
		emailSubject = strings.ReplaceAll(emailSubject, "{{id_member}}", member.MemberCode)
	}

	var emailBody string
	if template.ID != 0 && template.Content != "" {
		msgText := template.Content
		msgText = strings.ReplaceAll(msgText, "{{nama}}", member.FullName)
		msgText = strings.ReplaceAll(msgText, "{{link_reset}}", resetLink)
		msgText = strings.ReplaceAll(msgText, "{{nama_gym}}", settings.Name)
		msgText = strings.ReplaceAll(msgText, "{{id_member}}", member.MemberCode)

		emailBody = fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 40px 10px;">
			<div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
				<div style="font-size: 16px; color: #333; white-space: pre-wrap;">%s</div>
			</div>
		</body>
		</html>
		`, strings.ReplaceAll(msgText, "\n", "<br/>"))
	} else {
		emailBody = fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 40px 10px;">
			<div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
				<h2 style="color: #2563eb; margin-top: 0; font-size: 24px; font-weight: bold; text-align: center;">Permintaan Reset Password</h2>
				<p style="font-size: 16px; margin-top: 20px;">Halo <strong>%s</strong>,</p>
				<p style="font-size: 16px;">Kami menerima permintaan untuk mereset password akun Anda di <strong>%s</strong>.</p>
				<p style="font-size: 16px;">Silakan klik tombol biru di bawah ini untuk mereset password Anda. Link ini hanya berlaku selama <strong>1 jam</strong>:</p>
				<p style="text-align: center; margin: 30px 0;">
					<a href="%s" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);">Reset Password Baru</a>
				</p>
				<p style="font-size: 14px; color: #64748b;">Jika tombol di atas tidak berfungsi, Anda juga dapat menyalin dan membuka link berikut di browser Anda:</p>
				<p style="word-break: break-all; color: #2563eb; font-size: 14px; background-color: #f1f5f9; padding: 12px; border-radius: 8px;">%s</p>
				<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
				<p style="font-size: 12px; color: #94a3b8; text-align: center;">Jika Anda tidak melakukan permintaan ini, silakan abaikan email ini secara aman.</p>
			</div>
		</body>
		</html>
		`, member.FullName, settings.Name, resetLink, resetLink)
	}

	// Send SMTP Email
	err = utils.SendEmail(settings.SMTPHost, settings.SMTPPort, settings.SMTPEmail, settings.SMTPPassword, member.Email, emailSubject, emailBody)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal mengirim email reset password. Hubungi admin."})
	}

	msgText := fmt.Sprintf("Halo %s, saya sudah kirim request reset password namun belum menerima email reset untuk member %s", settings.Name, member.FullName)

	return c.JSON(fiber.Map{
		"status":      "success",
		"message":     "Email reset password berhasil dikirim",
		"email":       censorEmail(member.Email),
		"admin_phone": settings.Phone,
		"text":        msgText,
	})
}
