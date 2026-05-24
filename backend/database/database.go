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
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta client_encoding=UTF8", host, user, pass, name, port)
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

	seedMessageTemplates()
}

func seedMessageTemplates() {
	templates := []models.MessageTemplate{
		// 1. Password Reset (reset)
		{
			Title:   "Lupa Kata Sandi",
			Type:    "reset",
			Channel: "wa",
			Content: "Halo {{nama}},\n\nKami menerima permintaan reset password untuk akun Anda di {{nama_gym}}.\nSilakan gunakan link berikut untuk membuat password baru Anda:\n{{link_reset}}\n\nLink ini hanya berlaku selama 1 jam.\nJika Anda tidak melakukan permintaan ini, silakan abaikan pesan ini.",
		},
		{
			Title:   "Permintaan Reset Kata Sandi Anda - {{nama_gym}}",
			Type:    "reset",
			Channel: "email",
			Content: "Halo {{nama}},\n\nKami menerima permintaan untuk mereset kata sandi akun Anda di <strong>{{nama_gym}}</strong>.\n\nUntuk melanjutkan proses reset, silakan klik tombol di bawah ini:\n\n{{link_reset}}\n\nTautan ini bersifat rahasia dan hanya berlaku selama <strong>1 jam</strong>. Jika Anda tidak melakukan permintaan ini, silakan abaikan email ini secara aman.",
		},

		// 2. User Approve (acc)
		{
			Title:   "Pendaftaran Disetujui",
			Type:    "acc",
			Channel: "wa",
			Content: "Halo {{nama}},\n\nSelamat! Pendaftaran keanggotaan Anda di gym telah disetujui.\nKode Member: {{id_member}}\nPassword: {{password}}\n\nSilakan login ke portal member menggunakan link berikut:\n{{link_login}}\n\nSelamat berlatih!",
		},
		{
			Title:   "Selamat! Keanggotaan Anda Telah Aktif di {{nama_gym}}",
			Type:    "acc",
			Channel: "email",
			Content: "Halo {{nama}},\n\nKami dengan gembira menginformasikan bahwa pendaftaran keanggotaan Anda di <strong>{{nama_gym}}</strong> telah resmi disetujui oleh admin!\n\nBerikut adalah rincian akses akun Anda:\n- **Kode Member:** {{id_member}}\n- **Kata Sandi Sementara:** {{password}}\n\nSilakan masuk ke portal keanggotaan Anda untuk melengkapi profil dan mencetak kartu QR Code digital Anda dengan mengklik tombol di bawah:\n\n{{link_login}}\n\nDemi keamanan akun, Anda akan diminta untuk mengubah kata sandi sementara saat pertama kali masuk.\n\nSelamat berlatih dan mari raih tubuh bugar bersama kami!",
		},

		// 3. Billing Reminder (tagihan)
		{
			Title:   "Pengingat Iuran Bulanan",
			Type:    "tagihan",
			Channel: "wa",
			Content: "Halo {{nama}},\n\nMasa aktif langganan Anda akan berakhir pada {{jatuh_tempo}} (sisa {{sisa_hari}} hari lagi).\n\nDetail tagihan:\n- Paket: {{harga_paket}}\n- Potongan: {{discount}}\n- Total Tagihan: {{tagihan}}\n\nMohon lakukan pembayaran tepat waktu untuk kenyamanan latihan Anda. Terima kasih!",
		},
		{
			Title:   "Pengingat Tagihan Iuran Bulanan Keanggotaan - {{nama_gym}}",
			Type:    "tagihan",
			Channel: "email",
			Content: "Halo {{nama}},\n\nKami ingin menginformasikan bahwa masa aktif paket langganan keanggotaan Anda di <strong>{{nama_gym}}</strong> akan segera berakhir pada **{{jatuh_tempo}}** (dalam {{sisa_hari}} hari lagi).\n\nBerikut adalah rincian iuran bulan ini:\n- **Harga Paket:** {{harga_paket}}\n- **Diskon/Potongan:** {{discount}}\n- **Total outstanding:** <span style='font-size: 18px; color: #ef4444; font-weight: bold;'>{{tagihan}}</span>\n\nUntuk menghindari non-aktifnya barcode check-in Anda, mohon lakukan perpanjangan iuran sebelum jatuh tempo.\n\nTerima kasih atas dedikasi dan kebersamaan Anda bersama kami!",
		},

		// 4. Payment Receipt (lunas)
		{
			Title:   "Konfirmasi Pembayaran Lunas",
			Type:    "lunas",
			Channel: "wa",
			Content: "Halo {{nama}},\n\nTerima kasih. Pembayaran iuran Anda sebesar {{nominal}} telah kami terima secara lunas pada {{tanggal}}.\n\nMasa aktif paket Anda telah diperpanjang.\n\nSalam sehat dari kami!",
		},
		{
			Title:   "Kuitansi Resmi Pembayaran Keanggotaan - {{nama_gym}}",
			Type:    "lunas",
			Channel: "email",
			Content: "Halo {{nama}},\n\nTerima kasih! Kami telah menerima pembayaran iuran keanggotaan Anda pada **{{tanggal}}** secara lunas.\n\nBerikut adalah rincian kuitansi pembayaran resmi:\n- **Kode Member:** {{id_member}}\n- **Nominal yang Dibayar:** <span style='font-size: 18px; color: #10b981; font-weight: bold;'>{{nominal}}</span>\n- **Harga Paket Langganan:** {{harga_paket}}\n- **Diskon/Potongan:** {{discount}}\n\nPaket keanggotaan Anda telah aktif kembali secara otomatis. Anda dapat melakukan check-in barcode di gerbang masuk seperti biasa.\n\nSalam sehat dan selamat berlatih!",
		},
	}

	for _, t := range templates {
		var count int64
		DB.Model(&models.MessageTemplate{}).Where("type = ? AND channel = ?", t.Type, t.Channel).Count(&count)
		if count == 0 {
			if err := DB.Create(&t).Error; err != nil {
				log.Printf("Failed to seed template %s (%s): %v\n", t.Type, t.Channel, err)
			} else {
				log.Printf("Seeded default template: %s for %s\n", t.Type, t.Channel)
			}
		}
	}
}
