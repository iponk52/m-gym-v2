package routes

import (
	"mgym-backend/handlers"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	// Dashboard routes
	api.Get("/dashboard", handlers.GetDashboardStats)

	// Auth routes
	api.Post("/auth/login", handlers.Login)
	api.Post("/auth/logout", handlers.Logout)
	api.Post("/auth/setup", handlers.SetupAdmin)
	api.Put("/auth/change-password/:id", handlers.ChangePasswordFirstLogin)

	// Member routes
	api.Get("/members", handlers.GetAllMembers)
	api.Post("/members/register", handlers.RegisterMember)
	api.Get("/members/:id", handlers.GetMemberProfile)
	api.Delete("/members/:id", handlers.DeleteMember)
	api.Put("/members/disable/:id", handlers.DisableMember)
	api.Put("/members/renew/:id", handlers.RenewMember)
	api.Post("/members/reset-password-link/:id", handlers.GenerateResetPasswordLink)
	api.Post("/public/reset-password", handlers.ProcessResetPassword)
	api.Put("/members/:id", handlers.UpdateMemberProfile)
	api.Put("/members/admin/:id", handlers.AdminUpdateMember)
	api.Put("/members/approve/:id", handlers.ApproveMember)
	api.Post("/members/send-password/:id", handlers.SendPasswordMessage)
	api.Post("/members/:id/photo", handlers.UploadMemberPhoto)
	api.Post("/members/send-message/:id", handlers.SendMemberMessage)

	// Attendance routes
	api.Post("/attendance/scan", handlers.ScanAttendance)
	api.Get("/attendance/history", handlers.GetAttendanceHistory)

	// Scanner Link routes
	api.Get("/scanner-links", handlers.GetScannerLinks)
	api.Post("/scanner-links", handlers.CreateScannerLink)
	api.Delete("/scanner-links/:id", handlers.DeleteScannerLink)
	api.Get("/scanner-links/validate/:secret", handlers.ValidateScannerLink)

	// Billing routes
	api.Get("/billing/status", handlers.GetBillingStatus)
	api.Post("/billing/send/:id", handlers.SendManualBilling)
	api.Post("/billing/paid/:id", handlers.MarkAsPaid)
	api.Get("/billing/history", handlers.GetBillingHistory)
	api.Post("/billing/send-receipt/:id", handlers.SendPaidReceipt)
	api.Post("/billing/undo/:id", handlers.UndoPayment)

	// Package routes
	api.Post("/packages", handlers.CreatePackage)
	api.Get("/packages", handlers.GetPackages)
	api.Put("/packages/:id", handlers.UpdatePackage)
	api.Delete("/packages/:id", handlers.DeletePackage)

	// Setting routes
	api.Get("/settings", handlers.GetSettings)
	api.Put("/settings", handlers.UpdateSettings)
	api.Post("/settings/logo", handlers.UploadGymLogo)

	// Admin Manage routes
	api.Get("/admins", handlers.GetAdmins)
	api.Post("/admins", handlers.CreateAdmin)
	api.Put("/admins/:id", handlers.UpdateAdmin)
	api.Delete("/admins/:id", handlers.DeleteAdmin)

	// Audit Log routes
	api.Get("/logs", handlers.GetLogs)

	// Reports route
	api.Get("/reports", handlers.GetReport)

	// Template routes
	api.Post("/templates", handlers.CreateTemplate)
	api.Get("/templates", handlers.GetTemplates)
	api.Put("/templates/:id", handlers.UpdateTemplate)
	api.Delete("/templates/:id", handlers.DeleteTemplate)

	// Discount routes
	api.Post("/discounts", handlers.CreateDiscount)
	api.Get("/discounts", handlers.GetDiscounts)
	api.Put("/discounts/:id", handlers.UpdateDiscount)
	api.Delete("/discounts/:id", handlers.DeleteDiscount)

	// Payment Method routes
	api.Post("/payment-methods", handlers.CreatePaymentMethod)
	api.Get("/payment-methods", handlers.GetPaymentMethods)
	api.Put("/payment-methods/:id", handlers.UpdatePaymentMethod)
	api.Delete("/payment-methods/:id", handlers.DeletePaymentMethod)

	// Article routes
	api.Post("/articles", handlers.CreateArticle)
	api.Get("/articles", handlers.GetArticles)
	api.Get("/articles/:id", handlers.GetArticleByID)
	api.Put("/articles/:id", handlers.UpdateArticle)
	api.Delete("/articles/:id", handlers.DeleteArticle)
	api.Post("/articles/upload-image", handlers.UploadArticleImage)

	// Public routes
	api.Get("/public/home", handlers.GetPublicHomeData)
	api.Get("/public/check-duplicate", handlers.CheckDuplicate)
	api.Post("/public/forgot-password-check", handlers.ForgotPasswordCheck)
	api.Post("/public/register", limiter.New(limiter.Config{
		Max:        3,
		Expiration: 10 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{"error": "Terlalu banyak pendaftaran dari IP ini. Silakan tunggu 10 menit."})
		},
	}), handlers.RegisterPublic)
}
