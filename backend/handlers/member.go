package handlers

import (
	"encoding/base64"
	"fmt"
	"strings"
	"mgym-backend/database"
	"mgym-backend/models"
	"mgym-backend/utils"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/skip2/go-qrcode"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	FullName  string `json:"full_name"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Address   string `json:"address"`
	DOB       string `json:"dob"` // Format: YYYY-MM-DD
	Gender    string `json:"gender"`
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
	PackageID  *uint  `json:"package_id"`
	DiscountID *uint  `json:"discount_id"`
}

func RegisterMember(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Phone = strings.TrimSpace(req.Phone)
	if strings.HasPrefix(req.Phone, "0") {
		req.Phone = "62" + req.Phone[1:]
	}

	dob, err := time.Parse("2006-01-02", req.DOB)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid DOB format. Use YYYY-MM-DD"})
	}

	passwordStr := req.Phone
	if !dob.IsZero() {
		passwordStr = dob.Format("020106")
	}
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(passwordStr), 10)

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

	// Generate unique QR string based on Phone and Timestamp
	qrString := fmt.Sprintf("MGYM-%s-%d", req.Phone, time.Now().Unix())

	member := models.Member{
		FullName: req.FullName,
		Phone:    req.Phone,
		Email:    req.Email,
		Address:  req.Address,
		DOB:      dob,
		Gender:   req.Gender,
		Password: string(hashedPassword),
		QRCode:   qrString,
	}

	// Save to DB
	if err := database.DB.Create(&member).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create member", "details": err.Error()})
	}

	member.MemberCode = fmt.Sprintf("GYM-%s-%03d", dob.Format("020106"), member.ID)
	database.DB.Save(&member)

	if req.StartDate != "" && req.EndDate != "" {
		start, _ := time.Parse("2006-01-02", req.StartDate)
		end, _ := time.Parse("2006-01-02", req.EndDate)
		sub := models.Subscription{
			MemberID:  member.ID,
			StartDate: start,
			EndDate:   end,
			Status:    "Active",
			PackageID: req.PackageID,
			DiscountID: req.DiscountID,
		}
		database.DB.Create(&sub)
	}

	// Generate QR Code Image as Base64 for the frontend
	var qrBase64 string
	if qrImg, err := qrcode.Encode(qrString, qrcode.Medium, 256); err == nil {
		qrBase64 = base64.StdEncoding.EncodeToString(qrImg)
	}

	LogActivity(c, "Add Member", "Added new member: "+member.FullName)

	return c.Status(201).JSON(fiber.Map{
		"message":  "Member registered successfully",
		"member":   member,
		"qr_image": "data:image/png;base64," + qrBase64,
	})
}

type UpdateProfileRequest struct {
	Phone   string `json:"phone"`
	Email   string `json:"email"`
	Address string `json:"address"`
}

func UpdateMemberProfile(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.Member
	if err := database.DB.First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if req.Phone != "" {
		req.Phone = strings.TrimSpace(req.Phone)
		if strings.HasPrefix(req.Phone, "0") {
			req.Phone = "62" + req.Phone[1:]
		}
		member.Phone = req.Phone
	}
	if req.Email != "" {
		member.Email = req.Email
	}
	if req.Address != "" {
		member.Address = req.Address
	}

	if err := database.DB.Save(&member).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update profile"})
	}

	LogActivity(c, "Update Profile", "Member updated own profile: "+member.FullName)

	return c.JSON(fiber.Map{"message": "Profile updated successfully"})
}

func UploadMemberPhoto(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.Member
	if err := database.DB.First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	file, err := c.FormFile("photo")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Failed to upload photo"})
	}

	os.MkdirAll("./uploads", os.ModePerm)

	filename := fmt.Sprintf("./uploads/member_%s_%s", id, file.Filename)
	if err := c.SaveFile(file, filename); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save photo"})
	}

	member.PhotoURL = "/uploads/" + file.Filename
	if err := database.DB.Save(&member).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save photo URL"})
	}

	LogActivity(c, "Upload Photo", "Member uploaded new photo: "+member.FullName)

	return c.JSON(fiber.Map{"message": "Photo uploaded successfully", "photo_url": member.PhotoURL})
}

func GetMemberProfile(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.Member
	if err := database.DB.Preload("Subscriptions.Package").Preload("Subscriptions.Discount").First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	return c.JSON(member)
}

func GetAllMembers(c *fiber.Ctx) error {
	// Restore previously soft-deleted members and mark them as Disabled
	database.DB.Exec("UPDATE members SET deleted_at = NULL, status = 'Disabled' WHERE deleted_at IS NOT NULL")

	var members []models.Member
	if err := database.DB.Preload("Subscriptions.Package").Preload("Subscriptions.Discount").Preload("Attendances", "check_out_time IS NULL").Find(&members).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch members"})
	}

	for i := range members {
		var attCount int64
		database.DB.Model(&models.Attendance{}).Where("member_id = ?", members[i].ID).Count(&attCount)

		var payCount int64
		database.DB.Table("payments").
			Joins("JOIN subscriptions ON subscriptions.id = payments.subscription_id").
			Where("subscriptions.member_id = ?", members[i].ID).
			Count(&payCount)

		members[i].HasHistory = (attCount > 0 || payCount > 0)
	}

	return c.JSON(members)
}

type AdminUpdateMemberRequest struct {
	FullName  string `json:"full_name"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Address   string `json:"address"`
	DOB       string `json:"dob"`
	Gender    string `json:"gender"`
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
	PackageID  *uint  `json:"package_id"`
	DiscountID *uint  `json:"discount_id"`
}

func AdminUpdateMember(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.Member
	if err := database.DB.First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	var req AdminUpdateMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	req.Phone = strings.TrimSpace(req.Phone)
	if strings.HasPrefix(req.Phone, "0") {
		req.Phone = "62" + req.Phone[1:]
	}

	member.FullName = req.FullName
	member.Phone = req.Phone
	member.Email = req.Email
	member.Address = req.Address
	member.Gender = req.Gender

	if req.DOB != "" {
		dob, err := time.Parse("2006-01-02", req.DOB)
		if err == nil {
			member.DOB = dob
		}
	}

	if req.StartDate != "" && req.EndDate != "" {
		start, _ := time.Parse("2006-01-02", req.StartDate)
		end, _ := time.Parse("2006-01-02", req.EndDate)

		var sub models.Subscription
		err := database.DB.Where("member_id = ?", member.ID).First(&sub).Error
		if err == nil {
			sub.StartDate = start
			sub.EndDate = end
			sub.Status = "Active"
			sub.PackageID = req.PackageID
			sub.DiscountID = req.DiscountID
			database.DB.Save(&sub)
		} else {
			newSub := models.Subscription{
				MemberID:  member.ID,
				StartDate: start,
				EndDate:   end,
				Status:    "Active",
				PackageID: req.PackageID,
				DiscountID: req.DiscountID,
			}
			database.DB.Create(&newSub)
		}
	}

	database.DB.Save(&member)
	LogActivity(c, "Update Member", "Admin updated member profile: "+member.FullName)
	return c.JSON(fiber.Map{"message": "Member updated", "member": member})
}

func formatRupiahMember(amount float64) string {
	str := fmt.Sprintf("%.0f", amount)
	var result []byte
	for i := len(str) - 1; i >= 0; i-- {
		result = append([]byte{str[i]}, result...)
		if (len(str)-i)%3 == 0 && i != 0 && str[i-1] != '-' {
			result = append([]byte{'.'}, result...)
		}
	}
	return string(result)
}

func SendMemberMessage(c *fiber.Ctx) error {
	id := c.Params("id")

	var member models.Member
	if err := database.DB.Preload("Subscriptions.Package").Preload("Subscriptions.Discount").First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	var template models.MessageTemplate
	database.DB.Where("type = ?", "member").First(&template)

	msgText := "Halo {{nama}}, ini pesan dari gym."
	if template.ID != 0 {
		msgText = template.Content
	}

	var activeSub *models.Subscription
	for _, s := range member.Subscriptions {
		if s.Status == "Active" {
			activeSub = &s
			break
		}
	}
	if activeSub == nil && len(member.Subscriptions) > 0 {
		activeSub = &member.Subscriptions[0]
	}

	hargaPaket := 0.0
	discountStr := "0"
	tagihan := 0.0
	jatuhTempo := "-"
	sisaHari := "0"

	if activeSub != nil {
		jatuhTempo = activeSub.EndDate.Format("2006-01-02")
		daysLeft := int(activeSub.EndDate.Sub(time.Now()).Hours() / 24)
		sisaHari = fmt.Sprintf("%d", daysLeft)

		if activeSub.PackageID != nil {
			hargaPaket = activeSub.Package.Price
			tagihan = hargaPaket
			
			if activeSub.DiscountID != nil && activeSub.Discount.ID != 0 {
				if activeSub.Discount.Type == "percentage" {
					potongan := hargaPaket * activeSub.Discount.Value / 100
					tagihan = hargaPaket - potongan
					discountStr = formatRupiahMember(potongan)
				} else if activeSub.Discount.Type == "fixed" || activeSub.Discount.Type == "nominal" {
					tagihan = hargaPaket - activeSub.Discount.Value
					discountStr = formatRupiahMember(activeSub.Discount.Value)
				}
				
				if tagihan < 0 {
					tagihan = 0
				}
			}
		}
	}

	msgText = strings.ReplaceAll(msgText, "{{nama}}", member.FullName)
	msgText = strings.ReplaceAll(msgText, "{{jatuh_tempo}}", jatuhTempo)
	msgText = strings.ReplaceAll(msgText, "{{sisa_hari}}", sisaHari)
	msgText = strings.ReplaceAll(msgText, "{{harga_paket}}", formatRupiahMember(hargaPaket))
	msgText = strings.ReplaceAll(msgText, "{{discount}}", discountStr)
	msgText = strings.ReplaceAll(msgText, "{{tagihan}}", formatRupiahMember(tagihan))
	msgText = strings.ReplaceAll(msgText, "{{tanggal}}", time.Now().Format("2006-01-02"))
	msgText = strings.ReplaceAll(msgText, "{{id_member}}", member.MemberCode)

	LogActivity(c, "Generate Message", "Generated WA message template for member: "+member.FullName)

	return c.JSON(fiber.Map{
		"message": "Template generated",
		"phone":   member.Phone,
		"text":    msgText,
		"status":  "success",
	})
}

func ApproveMember(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.Member
	if err := database.DB.Preload("Subscriptions.Package").First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	member.Status = "Active"
	database.DB.Save(&member)

	// Update pending subscription
	var pendingSub *models.Subscription
	for i, sub := range member.Subscriptions {
		if sub.Status == "Pending" {
			pendingSub = &member.Subscriptions[i]
			break
		}
	}

	if pendingSub != nil {
		pendingSub.Status = "Active"
		pendingSub.StartDate = time.Now()
		pendingSub.EndDate = time.Now().AddDate(0, 1, 0)
		database.DB.Save(pendingSub)

		amount := 0.0
		if pendingSub.PackageID != nil {
			amount = pendingSub.Package.Price
		}

		payment := models.Payment{
			SubscriptionID: pendingSub.ID,
			Amount:         amount,
			PaymentDate:    time.Now(),
		}
		database.DB.Create(&payment)
	}

	var template models.MessageTemplate
	database.DB.Where("type = ?", "acc").First(&template)

	msgText := "Pendaftaran Anda telah disetujui. Silakan login ke portal member menggunakan Password: {{password}}"
	if template.ID != 0 {
		msgText = template.Content
	}

	passwordStr := member.Phone
	if !member.DOB.IsZero() {
		passwordStr = member.DOB.Format("020106")
	}
	var settings models.GymSetting
	database.DB.First(&settings)
	siteAddr := settings.SiteAddress
	if siteAddr == "" {
		siteAddr = "http://localhost:5173"
	}
	linkLogin := fmt.Sprintf("%s/login", siteAddr)

	msgText = strings.ReplaceAll(msgText, "{{nama}}", member.FullName)
	msgText = strings.ReplaceAll(msgText, "{{password}}", passwordStr)
	msgText = strings.ReplaceAll(msgText, "{{link_login}}", linkLogin)
	msgText = strings.ReplaceAll(msgText, "{{id_member}}", member.MemberCode)

	LogActivity(c, "Approve Member", "Approved member registration: "+member.FullName)

	// Send SMTP Approval Email if configured and member has email
	if settings.SMTPHost != "" && settings.SMTPPassword != "" && settings.SMTPEmail != "" && member.Email != "" {
		emailSubject := "Pendaftaran Akun Disetujui - " + settings.Name
		if template.ID != 0 && template.Title != "" {
			emailSubject = template.Title
			emailSubject = strings.ReplaceAll(emailSubject, "{{nama}}", member.FullName)
			emailSubject = strings.ReplaceAll(emailSubject, "{{nama_gym}}", settings.Name)
			emailSubject = strings.ReplaceAll(emailSubject, "{{id_member}}", member.MemberCode)
		}

		emailBody := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 40px 10px;">
			<div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
				<h2 style="color: #2563eb; margin-top: 0; font-size: 24px; font-weight: bold; text-align: center;">Akun Anda Telah Aktif!</h2>
				<div style="font-size: 16px; margin-top: 20px; white-space: pre-wrap; background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9;">%s</div>
				<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
				<p style="font-size: 12px; color: #94a3b8; text-align: center;">Selamat datang di <strong>%s</strong>.</p>
			</div>
		</body>
		</html>
		`, strings.ReplaceAll(msgText, "\n", "<br/>"), settings.Name)

		// Async send so it doesn't block the HTTP request
		go func(toEmail, subject, body string) {
			_ = utils.SendEmail(settings.SMTPHost, settings.SMTPPort, settings.SMTPEmail, settings.SMTPPassword, toEmail, subject, body)
		}(member.Email, emailSubject, emailBody)
	}

	return c.JSON(fiber.Map{
		"message": "Member approved successfully", 
		"member": member,
		"phone": member.Phone,
		"text": msgText,
	})
}

func SendPasswordMessage(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.Member
	if err := database.DB.First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	var template models.MessageTemplate
	database.DB.Where("type = ?", "acc").First(&template)

	msgText := "Pendaftaran Anda telah disetujui. Silakan login ke portal member menggunakan Password: {{password}}"
	if template.ID != 0 {
		msgText = template.Content
	}

	passwordStr := member.Phone
	if !member.DOB.IsZero() {
		passwordStr = member.DOB.Format("020106")
	}
	var settings models.GymSetting
	database.DB.First(&settings)
	siteAddr := settings.SiteAddress
	if siteAddr == "" {
		siteAddr = "http://localhost:5173"
	}
	linkLogin := fmt.Sprintf("%s/login", siteAddr)

	msgText = strings.ReplaceAll(msgText, "{{nama}}", member.FullName)
	msgText = strings.ReplaceAll(msgText, "{{password}}", passwordStr)
	msgText = strings.ReplaceAll(msgText, "{{link_login}}", linkLogin)
	msgText = strings.ReplaceAll(msgText, "{{id_member}}", member.MemberCode)

	LogActivity(c, "Generate Password Message", "Generated WA password template for member: "+member.FullName)

	// Send SMTP Password Email if configured and member has email
	if settings.SMTPHost != "" && settings.SMTPPassword != "" && settings.SMTPEmail != "" && member.Email != "" {
		emailSubject := "Informasi Akun Member - " + settings.Name
		if template.ID != 0 && template.Title != "" {
			emailSubject = template.Title
			emailSubject = strings.ReplaceAll(emailSubject, "{{nama}}", member.FullName)
			emailSubject = strings.ReplaceAll(emailSubject, "{{nama_gym}}", settings.Name)
			emailSubject = strings.ReplaceAll(emailSubject, "{{id_member}}", member.MemberCode)
		}

		emailBody := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 40px 10px;">
			<div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
				<h2 style="color: #2563eb; margin-top: 0; font-size: 24px; font-weight: bold; text-align: center;">Informasi Akses Akun</h2>
				<div style="font-size: 16px; margin-top: 20px; white-space: pre-wrap; background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9;">%s</div>
				<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
				<p style="font-size: 12px; color: #94a3b8; text-align: center;">Pesan ini dikirim secara otomatis oleh <strong>%s</strong>.</p>
			</div>
		</body>
		</html>
		`, strings.ReplaceAll(msgText, "\n", "<br/>"), settings.Name)

		// Async send so it doesn't block the HTTP request
		go func(toEmail, subject, body string) {
			_ = utils.SendEmail(settings.SMTPHost, settings.SMTPPort, settings.SMTPEmail, settings.SMTPPassword, toEmail, subject, body)
		}(member.Email, emailSubject, emailBody)
	}

	return c.JSON(fiber.Map{
		"message": "Template generated",
		"phone":   member.Phone,
		"text":    msgText,
		"status":  "success",
	})
}

func DeleteMember(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.Member
	if err := database.DB.First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	var attendanceCount int64
	database.DB.Model(&models.Attendance{}).Where("member_id = ?", member.ID).Count(&attendanceCount)

	var paymentCount int64
	database.DB.Table("payments").
		Joins("JOIN subscriptions ON subscriptions.id = payments.subscription_id").
		Where("subscriptions.member_id = ?", member.ID).
		Count(&paymentCount)

	if attendanceCount == 0 && paymentCount == 0 {
		// Hard delete subscription yang mungkin masih berstatus pending
		database.DB.Unscoped().Where("member_id = ?", member.ID).Delete(&models.Subscription{})
		// Hard delete member
		database.DB.Unscoped().Delete(&member)
		LogActivity(c, "Delete Member", "Permanently deleted member: "+member.FullName)
		return c.JSON(fiber.Map{"message": "Member permanently deleted (no history)"})
	}

	// Soft delete jika memiliki history
	database.DB.Delete(&member)
	LogActivity(c, "Delete Member", "Soft deleted member: "+member.FullName)
	return c.JSON(fiber.Map{"message": "Member soft deleted successfully (history preserved)"})
}

func DisableMember(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.Member
	if err := database.DB.First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	member.Status = "Disabled"
	database.DB.Save(&member)

	var sub models.Subscription
	if err := database.DB.Where("member_id = ?", member.ID).Order("end_date desc").First(&sub).Error; err == nil {
		sub.Status = "Disabled"
		database.DB.Save(&sub)
	}

	LogActivity(c, "Disable Member", "Disabled member: "+member.FullName)

	return c.JSON(fiber.Map{"message": "Member disabled successfully"})
}

func RenewMember(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.Member
	if err := database.DB.Preload("Subscriptions.Package").Preload("Subscriptions.Discount").First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	member.Status = "Active"
	database.DB.Save(&member)

	var sub models.Subscription
	err := database.DB.Where("member_id = ?", member.ID).Order("id desc").First(&sub).Error
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Subscription not found"})
	}

	now := time.Now()
	
	// Create Payment record for the renew
	amount := 0.0
	if sub.PackageID != nil && sub.Package.ID != 0 {
		amount = sub.Package.Price
		if sub.DiscountID != nil && sub.Discount.ID != 0 {
			if sub.Discount.Type == "percentage" {
				amount = amount - (amount * sub.Discount.Value / 100)
			} else if sub.Discount.Type == "fixed" || sub.Discount.Type == "nominal" {
				amount = amount - sub.Discount.Value
			}
			if amount < 0 {
				amount = 0
			}
		}
	}

	payment := models.Payment{
		SubscriptionID: sub.ID,
		Amount:         amount,
		PaymentDate:    now,
	}
	database.DB.Create(&payment)

	sub.StartDate = now
	sub.EndDate = now.AddDate(0, 1, 0)
	sub.Status = "Active"
	database.DB.Save(&sub)

	LogActivity(c, "Renew Member", "Renewed member: "+member.FullName)

	return c.JSON(fiber.Map{"message": "Member renewed successfully", "subscription": sub})
}
