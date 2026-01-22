package userservicegorm

import (
	"ClickZone/domain/entities"
	"errors"
	"log"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserServiceGorm struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserServiceGorm {
	return &UserServiceGorm{db: db}
}
func (s *UserServiceGorm) CreateUser(user entities.User) error {
	var count int64

	if err := s.db.Model(&entities.User{}).
		Where("username = ?", user.Username).
		Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("username sudah digunakan")
	}

	if err := s.db.Model(&entities.User{}).
		Where("email = ?", user.Email).
		Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("email sudah digunakan")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(user.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hash)

	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	if err := s.db.Create(&user).Error; err != nil {
		return err
	}

	return nil
}

func (s *UserServiceGorm) Login(userLogin entities.UserLogin) (string, error) {
	if userLogin.UsernameOrEmail == "" || userLogin.Password == "" {
		return "", errors.New("username/email dan password harus diisi")
	}

	var user entities.User
	var query string
	var value string = userLogin.UsernameOrEmail

	if strings.Contains(userLogin.UsernameOrEmail, "@") {
		query = "email = ?"
	} else {
		query = "username = ?"
	}

	if err := s.db.Where(query, value).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("akun tidak ditemukan")
		}
		return "", nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(userLogin.Password)); err != nil {
		log.Fatalf("password salah")
	}
	return user.GameID, nil
}
