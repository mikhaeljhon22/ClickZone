package utilspaseto

import (
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/o1egl/paseto"
)

type TokenPayload struct {
	GameID   string
	ExpireAt time.Time
}

var (
	b, _        = hex.DecodeString("1eb9dbbbbc047c03fd70604e0071f0987e16b28b757225c11f00415d0e20b1a2")
	publicKey   = ed25519.PublicKey(b)
	bPrivate, _ = hex.DecodeString("b4cbfb43df4ce210727d953e4a713307fa19bb7d9f85041438d9e11b942a37741eb9dbbbbc047c03fd70604e0071f0987e16b28b757225c11f00415d0e20b1a2")
	privateKey  = ed25519.PrivateKey(bPrivate)
	footer      = "some footer"
)

func GenerateToken(payload TokenPayload) (string, error) {

	jsonToken := paseto.JSONToken{
		Expiration: payload.ExpireAt,
	}

	jsonToken.Set("gameID", payload.GameID)

	token, err := paseto.NewV2().Sign(privateKey, jsonToken, footer)
	if err != nil {
		return "", fmt.Errorf("error generate paseto token %w", err)
	}
	return token, nil
}

func VerifyToken(token string) (string, bool) {
	var newJsonToken paseto.JSONToken
	var newFooter string
	if err := paseto.NewV2().Verify(token, publicKey, &newJsonToken, &newFooter); err != nil {
		return "", false
	}
	decryptToken := &TokenPayload{
		GameID:   newJsonToken.Get("gameID"),
		ExpireAt: newJsonToken.Expiration,
	}
	decryptJsonBytes, err := json.Marshal(decryptToken)
	if err != nil {
		log.Println("JSON marshal error:", err)
	}

	return string(decryptJsonBytes), true
}
