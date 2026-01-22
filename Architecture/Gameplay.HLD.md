Battle Click 1 V 1
Architecture: Saga Orchetration,Saga Choreography
Datastore: Redis
Message Broker: Apache Kafka
API: Websocket
Driver: Apache Kafka(Sarama library), Redis(Redis 9 library in Go), Mongodb(Mongodb library), Websocket(Gorilla library), HTTP(Gorilla Mux library)

[Matchmaking] 
Memakai arsitektur saga orchestration. Pencocokan berdasarkan rank ketika bermain di mode rank. Ketika bermain di mode casual maka tidak ada pencocokan apapun, hanya ambil berdasarkan antrian match

[Gameplay]
Memakai arsitektur event drivent dengan WS to WS. Setiap serangan klik mengumpulkan poin damage, Poin damage di publish dan di subscribe di broker lalu di pub dan sub bukan redis pub sub tapi redis stream dengan XAdd dan XRead

