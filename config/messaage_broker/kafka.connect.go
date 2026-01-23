package messaagebroker

import (
	"github.com/IBM/sarama"
)

func KafkaConnection() ([]string, *sarama.Config) {
	config := sarama.NewConfig()
	config.Producer.Return.Successes = true
	config.Producer.Retry.Max = 5

	return []string{"localhost:9092"}, config
}
