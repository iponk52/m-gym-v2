package models

import (
	"time"

	"gorm.io/gorm"
)

type Admin struct {
	gorm.Model
	Username string `gorm:"unique;not null" json:"username"`
	Password string `gorm:"not null" json:"-"`
	Role     string `gorm:"not null;default:'admin'" json:"role"`
}

type Member struct {
	gorm.Model
	FullName      string         `gorm:"not null" json:"full_name"`
	Phone         string         `gorm:"unique;not null" json:"phone"`
	Email         string         `gorm:"unique" json:"email"`
	Address       string         `json:"address"`
	DOB           time.Time      `json:"dob"`
	Gender        string         `json:"gender"`
	Password      string         `gorm:"not null" json:"-"`
	MemberCode    string         `gorm:"unique" json:"member_code"`
	PhotoURL      string         `json:"photo_url"`
	QRCode        string         `gorm:"unique;not null" json:"qr_code"`
	Status             string         `gorm:"not null;default:'Active'" json:"status"`
	MustChangePassword bool           `gorm:"default:true" json:"must_change_password"`
	Subscriptions      []Subscription `gorm:"foreignKey:MemberID" json:"subscriptions"`
	Attendances   []Attendance   `gorm:"foreignKey:MemberID" json:"attendances"`
	HasHistory         bool           `gorm:"-" json:"has_history"`
}

type Package struct {
	gorm.Model
	Name        string  `gorm:"not null" json:"name"`
	Description string  `json:"description"`
	Price       float64 `gorm:"not null" json:"price"`
}

type Subscription struct {
	gorm.Model
	MemberID   uint      `gorm:"not null" json:"member_id"`
	Member     Member    `gorm:"foreignKey:MemberID" json:"member"`
	PackageID  *uint     `json:"package_id"`
	Package    Package   `gorm:"foreignKey:PackageID" json:"package"`
	StartDate  time.Time `gorm:"not null" json:"start_date"`
	EndDate    time.Time `gorm:"not null" json:"end_date"`
	Status     string    `gorm:"not null;default:'Active'" json:"status"`
	DiscountID *uint     `json:"discount_id"`
	Discount   Discount  `gorm:"foreignKey:DiscountID" json:"discount"`
}

type Payment struct {
	gorm.Model
	SubscriptionID uint         `gorm:"not null" json:"subscription_id"`
	Subscription   Subscription `gorm:"foreignKey:SubscriptionID" json:"subscription"`
	Amount          float64      `gorm:"not null" json:"amount"`
	PaymentDate     time.Time    `gorm:"not null" json:"payment_date"`
	PreviousEndDate *time.Time   `json:"previous_end_date"`
}

type Attendance struct {
	gorm.Model
	MemberID     uint      `gorm:"not null" json:"member_id"`
	Member       Member    `gorm:"foreignKey:MemberID" json:"member"`
	CheckInTime  time.Time `gorm:"not null" json:"check_in_time"`
	CheckOutTime *time.Time `json:"check_out_time"`
}

type MessageTemplate struct {
	gorm.Model
	Title   string `gorm:"not null" json:"title"`
	Content string `gorm:"type:text;not null" json:"content"`
	Type    string `gorm:"not null;default:'umum'" json:"type"`
}

type Discount struct {
	gorm.Model
	Name        string  `gorm:"not null" json:"name"`
	Description string  `json:"description"`
	Type        string  `gorm:"not null" json:"type"`
	Value       float64 `gorm:"not null" json:"value"`
}

type ScannerLink struct {
	gorm.Model
	Name      string `gorm:"not null" json:"name"`
	SecretKey string `gorm:"unique;not null" json:"secret_key"`
}

type GymSetting struct {
	gorm.Model
	Name         string `json:"name"`
	Address      string `json:"address"`
	About        string `json:"about"`
	LogoURL      string `json:"logo_url"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	HeroTitle    string `json:"hero_title"`
	HeroSubtitle string `json:"hero_subtitle"`
	SiteAddress  string `json:"site_address"`
}

type Article struct {
	gorm.Model
	Title    string `gorm:"not null" json:"title"`
	Content  string `gorm:"type:text;not null" json:"content"`
	CoverURL string `json:"cover_url"`
	Author   string `json:"author"`
}

type PaymentMethod struct {
	gorm.Model
	Name          string `gorm:"not null" json:"name"`
	AccountName   string `gorm:"not null" json:"account_name"`
	AccountNumber string `gorm:"not null" json:"account_number"`
	Icon          string `json:"icon"` // e.g. Wallet, Smartphone, Landmark, QrCode
}

type AuditLog struct {
	gorm.Model
	Actor     string `gorm:"not null" json:"actor"`
	Role      string `gorm:"not null" json:"role"`
	IPAddress string `json:"ip_address"`
	Action    string `gorm:"not null" json:"action"`
	Details   string `gorm:"type:text" json:"details"`
}
