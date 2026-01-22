package interfaces

import (
	"ClickZone/domain/entities"
)

type UserService interface {
	CreateUser(user entities.User) error
	Login(userLogin entities.UserLogin) error
}
