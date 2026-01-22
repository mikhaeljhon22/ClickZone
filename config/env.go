package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment")
	}
}

func GetSymmetricKey() []byte {
	key := os.Getenv("SYMMETRIC_KEY_PASETO")
	if len(key) != 32 {
		log.Fatalf("SYMMETRIC_KEY_PASETO harus 32 bytes, saat ini %d bytes", len(key))
	}
	return []byte(key)
}
