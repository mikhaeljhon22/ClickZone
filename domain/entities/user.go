package entities

import (
	"time"
)

type User struct {
	ID           int       `gorm:"primaryKey;autoIncrement"`
	GameID       string    `gorm:"size:50;unique;not null"`
	Username     string    `gorm:"size:50;unique;not null"`
	Gender       string    `gorm:"size:10"`
	Email        string    `gorm:"size:100;unique;not null"`
	PasswordHash string    `gorm:"size:255;not null"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
}

type UserLogin struct {
	ID              int `gorm:"primaryKey;autoIncrement"`
	UsernameOrEmail string
	Password        string
}
