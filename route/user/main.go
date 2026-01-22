package routeuser

import (
	"ClickZone/domain/entities"
	userservicegorm "ClickZone/ports/user"
	utilspaseto "ClickZone/utils/auth"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type UserRoute struct {
	userService *userservicegorm.UserServiceGorm
}

func NewUserRoute(userService *userservicegorm.UserServiceGorm) *UserRoute {
	return &UserRoute{userService: userService}
}

func (ur *UserRoute) CreateUser(w http.ResponseWriter, r *http.Request) {
	type Request struct {
		GameID   string `json:"gameId" validate:"required"`
		Username string `json:"username" validate:"required,min=3,max=50"`
		Gender   string `json:"gender" validate:"omitempty,oneof=male female other"`
		Email    string `json:"email" validate:"required,email"`
		Password string `json:"password" validate:"required,min=6"`
	}

	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(400)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user := entities.User{
		GameID:       req.GameID,
		Username:     req.Username,
		Email:        req.Email,
		Gender:       req.Gender,
		PasswordHash: req.Password,
	}
	if err := ur.userService.CreateUser(user); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "User created successfully",
	})
}

func (ur *UserRoute) Login(w http.ResponseWriter, r *http.Request) {
	type Request struct {
		UsernameOrEmail string `json:"usernameOrEmail" validate:"required"`
		Password        string `json:"password" validate:"required"` // Fixed typo: "passworrd" → "password"
	}

	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(400)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userLogin := entities.UserLogin{
		UsernameOrEmail: req.UsernameOrEmail,
		Password:        req.Password,
	}

	gameID, err := ur.userService.Login(userLogin)
	if err != nil {
		fmt.Errorf(err.Error())
		w.WriteHeader(401)
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}
	payloadToken := utilspaseto.TokenPayload{
		GameID:   gameID,
		ExpireAt: time.Now().Add(30 * 24 * time.Hour),
	}
	token, err := utilspaseto.GenerateToken(payloadToken)
	if err != nil {
		fmt.Errorf("error token generate %w", err.Error())
	}
	fmt.Println(token)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Login successful",
	})
}
