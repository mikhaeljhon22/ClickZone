package userservice

import (
	"ClickZone/domain/entities"
	userPort "ClickZone/ports/user"

	"gorm.io/gorm"
)

type UserService struct {
	db       *gorm.DB
	userPort *userPort.UserServiceGorm
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

func (us *UserService) CreateUser(user entities.User) error {
	return us.userPort.CreateUser(user)
}

func (us *UserService) Login(userLogin entities.UserLogin) (string, error) {
	return us.userPort.Login(userLogin)
}
