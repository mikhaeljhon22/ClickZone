package messagebroker

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

var (
	ctx = context.Background()
)

func RedisConnect() *redis.Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "",
		DB:       0,
	})

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Gagal connect ke Redis: %v", err)
	}
	fmt.Println("Redis connected")
	return rdb
}

func Publish(rdb *redis.Client, channel string, message any) error {
	err := rdb.Publish(ctx, channel, message).Err()
	if err != nil {
		fmt.Println("error ", err)
		return fmt.Errorf("publish error: %v", err)
	}
	fmt.Printf("Published message '%s' ke channel '%s'\n", message, channel)
	return nil
}

func Subscribe(rdb *redis.Client, channel string) <-chan *redis.Message {
	sub := rdb.Subscribe(ctx, channel)
	_, err := sub.Receive(ctx)
	if err != nil {
		log.Fatalf("Subscribe error: %v", err)
	}

	ch := sub.Channel()
	fmt.Printf("Subscribed ke channel '%s', menunggu pesan...\n", channel)
	payloadChan := make(chan *redis.Message)

	go func() {
		defer close(payloadChan)
		for msg := range ch {
			payloadChan <- msg
		}
	}()
	return payloadChan
}
