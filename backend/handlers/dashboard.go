package handlers

import (
	"mgym-backend/database"
	"mgym-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
)

func GetDashboardStats(c *fiber.Ctx) error {
	filter := c.Query("filter", "monthly") // daily, weekly, monthly, yearly

	now := time.Now()
	var startDate time.Time

	switch filter {
	case "daily":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	case "weekly":
		// Find previous Monday
		offset := int(time.Monday - now.Weekday())
		if offset > 0 {
			offset = -6
		}
		startDate = time.Date(now.Year(), now.Month(), now.Day()+offset, 0, 0, 0, 0, now.Location())
	case "monthly":
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	case "yearly":
		startDate = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
	default:
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	}

	// 1. Total Members (Absolute)
	var totalMembers int64
	database.DB.Model(&models.Member{}).Count(&totalMembers)

	var activeMembers int64
	database.DB.Model(&models.Subscription{}).Where("end_date >= ?", now).Distinct("member_id").Count(&activeMembers)
	inactiveMembers := totalMembers - activeMembers

	// 2. Overdue Bills (Absolute)
	var overdueBills int64
	database.DB.Model(&models.Subscription{}).Where("end_date < ?", now).Count(&overdueBills)

	// 3. New Members (Time-based)
	var recentMembers []models.Member
	database.DB.Where("created_at >= ? AND created_at <= ?", startDate, now).Find(&recentMembers)
	newMembers := len(recentMembers)

	// 4. Check-ins (Time-based)
	var attendances []models.Attendance
	database.DB.Where("check_in_time >= ? AND check_in_time <= ?", startDate, now).Find(&attendances)
	activeToday := len(attendances)

	// 4. Revenue (Time-based)
	var payments []models.Payment
	database.DB.Where("payment_date >= ? AND payment_date <= ?", startDate, now).Find(&payments)
	var revenue float64
	for _, p := range payments {
		revenue += p.Amount
	}

	// 5. Build Chart Data
	// For simplicity, we will group data by standard buckets
	chartMap := make(map[string]map[string]float64) // e.g. "2023-10-01": {"revenue": 1000, "attendance": 5}
	var orderedLabels []string

	if filter == "daily" {
		// Group by hour
		for i := 0; i <= now.Hour(); i++ {
			label := time.Date(now.Year(), now.Month(), now.Day(), i, 0, 0, 0, now.Location()).Format("15:00")
			orderedLabels = append(orderedLabels, label)
			chartMap[label] = map[string]float64{"revenue": 0, "attendance": 0, "new_members": 0}
		}
		for _, m := range recentMembers {
			label := m.CreatedAt.Format("15:00")
			if _, exists := chartMap[label]; exists {
				chartMap[label]["new_members"] += 1
			}
		}
		for _, p := range payments {
			label := p.PaymentDate.Format("15:00")
			if _, exists := chartMap[label]; exists {
				chartMap[label]["revenue"] += p.Amount
			}
		}
		for _, a := range attendances {
			label := a.CheckInTime.Format("15:00")
			if _, exists := chartMap[label]; exists {
				chartMap[label]["attendance"] += 1
			}
		}
	} else if filter == "weekly" {
		// Group by day names from Monday to Today
		for i := 0; i <= int(now.Sub(startDate).Hours()/24); i++ {
			date := startDate.AddDate(0, 0, i)
			label := date.Format("Mon")
			orderedLabels = append(orderedLabels, label)
			chartMap[label] = map[string]float64{"revenue": 0, "attendance": 0, "new_members": 0}
		}
		for _, m := range recentMembers {
			label := m.CreatedAt.Format("Mon")
			if _, exists := chartMap[label]; exists {
				chartMap[label]["new_members"] += 1
			}
		}
		for _, p := range payments {
			label := p.PaymentDate.Format("Mon")
			if _, exists := chartMap[label]; exists {
				chartMap[label]["revenue"] += p.Amount
			}
		}
		for _, a := range attendances {
			label := a.CheckInTime.Format("Mon")
			if _, exists := chartMap[label]; exists {
				chartMap[label]["attendance"] += 1
			}
		}
	} else if filter == "monthly" {
		// Group by day of month
		for i := 1; i <= now.Day(); i++ {
			label := time.Date(now.Year(), now.Month(), i, 0, 0, 0, 0, now.Location()).Format("02")
			orderedLabels = append(orderedLabels, label)
			chartMap[label] = map[string]float64{"revenue": 0, "attendance": 0, "new_members": 0}
		}
		for _, m := range recentMembers {
			label := m.CreatedAt.Format("02")
			if _, exists := chartMap[label]; exists {
				chartMap[label]["new_members"] += 1
			}
		}
		for _, p := range payments {
			label := p.PaymentDate.Format("02")
			if _, exists := chartMap[label]; exists {
				chartMap[label]["revenue"] += p.Amount
			}
		}
		for _, a := range attendances {
			label := a.CheckInTime.Format("02")
			if _, exists := chartMap[label]; exists {
				chartMap[label]["attendance"] += 1
			}
		}
	} else if filter == "yearly" {
		// Group by month
		for i := 1; i <= int(now.Month()); i++ {
			label := time.Month(i).String()[:3] // Jan, Feb, Mar
			orderedLabels = append(orderedLabels, label)
			chartMap[label] = map[string]float64{"revenue": 0, "attendance": 0, "new_members": 0}
		}
		for _, m := range recentMembers {
			label := m.CreatedAt.Month().String()[:3]
			if _, exists := chartMap[label]; exists {
				chartMap[label]["new_members"] += 1
			}
		}
		for _, p := range payments {
			label := p.PaymentDate.Month().String()[:3]
			if _, exists := chartMap[label]; exists {
				chartMap[label]["revenue"] += p.Amount
			}
		}
		for _, a := range attendances {
			label := a.CheckInTime.Month().String()[:3]
			if _, exists := chartMap[label]; exists {
				chartMap[label]["attendance"] += 1
			}
		}
	}

	// Flatten chart data for UI
	var chartData []fiber.Map
	for _, label := range orderedLabels {
		chartData = append(chartData, fiber.Map{
			"label":       label,
			"revenue":     chartMap[label]["revenue"],
			"attendance":  chartMap[label]["attendance"],
			"new_members": chartMap[label]["new_members"],
		})
	}

	return c.JSON(fiber.Map{
		"total_members":    totalMembers,
		"active_members":   activeMembers,
		"inactive_members": inactiveMembers,
		"new_members":      newMembers,
		"overdue_bills":    overdueBills,
		"active_today":     activeToday,
		"revenue":          revenue,
		"chart_data":       chartData,
	})
}
