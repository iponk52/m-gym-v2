package utils

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
)

// SendEmail sends an HTML/plain email using standard SMTP (STARTTLS on port 587) or Direct SSL/TLS (port 465).
func SendEmail(host string, port int, from, password, to, subject, body string) error {
	header := make(map[string]string)
	header["From"] = from
	header["To"] = to
	header["Subject"] = subject
	header["MIME-Version"] = "1.0"
	header["Content-Type"] = "text/html; charset=\"utf-8\""

	message := ""
	for k, v := range header {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + body

	addr := fmt.Sprintf("%s:%d", host, port)

	if port == 465 {
		// Port 465 requires direct SSL/TLS connection
		conn, err := tls.Dial("tcp", addr, &tls.Config{
			InsecureSkipVerify: true,
			ServerName:         host,
		})
		if err != nil {
			return fmt.Errorf("tls dial failed: %w", err)
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, host)
		if err != nil {
			return fmt.Errorf("smtp client creation failed: %w", err)
		}
		defer client.Close()

		auth := smtp.PlainAuth("", from, password, host)
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("smtp auth failed: %w", err)
		}

		if err = client.Mail(from); err != nil {
			return fmt.Errorf("smtp mail command failed: %w", err)
		}

		if err = client.Rcpt(to); err != nil {
			return fmt.Errorf("smtp rcpt command failed: %w", err)
		}

		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("smtp data command failed: %w", err)
		}

		_, err = w.Write([]byte(message))
		if err != nil {
			return fmt.Errorf("smtp write failed: %w", err)
		}

		err = w.Close()
		if err != nil {
			return fmt.Errorf("smtp close failed: %w", err)
		}

		return client.Quit()
	} else {
		// Port 587 or others: use standard smtp.SendMail
		auth := smtp.PlainAuth("", from, password, host)
		err := smtp.SendMail(addr, auth, from, []string{to}, []byte(message))
		if err != nil {
			return fmt.Errorf("smtp sendmail failed: %w", err)
		}
		return nil
	}
}
