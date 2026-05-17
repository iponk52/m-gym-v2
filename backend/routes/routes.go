package routes

import (
	"mgym-backend/handlers"
	"mgym-backend/middleware"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

func SetupRoutes(app *fiber.App) {
	// 1. XSS Protection
	app.Use(helmet.New())

	api := app.Group("/api")

	// 2. Brute Force Protection Limiters
	loginLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 5 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{"error": "Terlalu banyak percobaan. Silakan tunggu 5 menit."})
		},
	})

	registerLimiter := limiter.New(limiter.Config{
		Max:        3,
		Expiration: 10 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{"error": "Terlalu banyak pendaftaran dari IP ini. Silakan tunggu 10 menit."})
		},
	})

	// ==========================================
	// PUBLIC ROUTES (No Authentication Required)
	// ==========================================

	// Auth
	api.Post("/auth/login", loginLimiter, handlers.Login)
	api.Post("/auth/logout", handlers.Logout)
	api.Post("/auth/setup", handlers.SetupAdmin)

	// Public Forms & Data
	api.Get("/public/home", handlers.GetPublicHomeData)
	api.Get("/public/check-duplicate", handlers.CheckDuplicate)
	api.Post("/public/forgot-password-check", loginLimiter, handlers.ForgotPasswordCheck)
	api.Post("/public/register", registerLimiter, handlers.RegisterPublic)
	api.Post("/public/reset-password", handlers.ProcessResetPassword)

	// Public Scanners & Web Data
	api.Get("/scanner-links/validate/:secret", handlers.ValidateScannerLink)
	api.Post("/attendance/scan", handlers.ScanAttendance)
	api.Get("/settings", handlers.GetSettings)
	api.Get("/packages", handlers.GetPackages)
	api.Get("/payment-methods", handlers.GetPaymentMethods)
	api.Get("/articles", handlers.GetArticles)
	api.Get("/articles/:id", handlers.GetArticleByID)


	// ==========================================
	// PROTECTED ROUTES (Requires ANY valid Token)
	// ==========================================
	protected := api.Group("", middleware.Protected())

	protected.Get("/members/:id", handlers.GetMemberProfile)
	protected.Put("/members/:id", handlers.UpdateMemberProfile)
	protected.Put("/auth/change-password/:id", handlers.ChangePasswordFirstLogin)
	protected.Post("/members/:id/photo", handlers.UploadMemberPhoto)


	// ==========================================
	// ADMIN ROUTES (Requires Admin Token)
	// ==========================================
	admin := protected.Group("", middleware.AdminOnly())

	admin.Get("/dashboard", handlers.GetDashboardStats)
	
	admin.Get("/members", handlers.GetAllMembers)
	admin.Post("/members/register", handlers.RegisterMember)
	admin.Delete("/members/:id", handlers.DeleteMember)
	admin.Put("/members/disable/:id", handlers.DisableMember)
	admin.Put("/members/renew/:id", handlers.RenewMember)
	admin.Post("/members/reset-password-link/:id", handlers.GenerateResetPasswordLink)
	admin.Put("/members/admin/:id", handlers.AdminUpdateMember)
	admin.Put("/members/approve/:id", handlers.ApproveMember)
	admin.Post("/members/send-password/:id", handlers.SendPasswordMessage)
	admin.Post("/members/send-message/:id", handlers.SendMemberMessage)

	admin.Get("/attendance/history", handlers.GetAttendanceHistory)

	admin.Get("/scanner-links", handlers.GetScannerLinks)
	admin.Post("/scanner-links", handlers.CreateScannerLink)
	admin.Delete("/scanner-links/:id", handlers.DeleteScannerLink)

	admin.Get("/billing/status", handlers.GetBillingStatus)
	admin.Post("/billing/send/:id", handlers.SendManualBilling)
	admin.Post("/billing/paid/:id", handlers.MarkAsPaid)
	admin.Get("/billing/history", handlers.GetBillingHistory)
	admin.Post("/billing/send-receipt/:id", handlers.SendPaidReceipt)
	admin.Post("/billing/undo/:id", handlers.UndoPayment)

	admin.Post("/packages", handlers.CreatePackage)
	admin.Put("/packages/:id", handlers.UpdatePackage)
	admin.Delete("/packages/:id", handlers.DeletePackage)

	admin.Put("/settings", handlers.UpdateSettings)
	admin.Post("/settings/logo", handlers.UploadGymLogo)

	admin.Get("/admins", handlers.GetAdmins)
	admin.Post("/admins", handlers.CreateAdmin)
	admin.Put("/admins/:id", handlers.UpdateAdmin)
	admin.Delete("/admins/:id", handlers.DeleteAdmin)

	admin.Get("/logs", handlers.GetLogs)
	admin.Get("/reports", handlers.GetReport)

	admin.Post("/templates", handlers.CreateTemplate)
	admin.Get("/templates", handlers.GetTemplates)
	admin.Put("/templates/:id", handlers.UpdateTemplate)
	admin.Delete("/templates/:id", handlers.DeleteTemplate)

	admin.Post("/discounts", handlers.CreateDiscount)
	admin.Get("/discounts", handlers.GetDiscounts)
	admin.Put("/discounts/:id", handlers.UpdateDiscount)
	admin.Delete("/discounts/:id", handlers.DeleteDiscount)

	admin.Post("/payment-methods", handlers.CreatePaymentMethod)
	admin.Put("/payment-methods/:id", handlers.UpdatePaymentMethod)
	admin.Delete("/payment-methods/:id", handlers.DeletePaymentMethod)

	admin.Post("/articles", handlers.CreateArticle)
	admin.Put("/articles/:id", handlers.UpdateArticle)
	admin.Delete("/articles/:id", handlers.DeleteArticle)
	admin.Post("/articles/upload-image", handlers.UploadArticleImage)
}
