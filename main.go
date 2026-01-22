package main

import (
	"ClickZone/config/datastore"
	"ClickZone/config/db"
	"ClickZone/domain/entities"
	userservicegorm "ClickZone/ports/user"
	routeuser "ClickZone/route/user"
	schemaapplication "ClickZone/schema-application"
	"crypto/tls"
	"log"
	"net/http"
	"time"

	"gorm.io/gorm"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func startHTTPServer(dbConn *gorm.DB) {

	mux := http.NewServeMux()

	// Basic routes
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Write([]byte("🚀 HTTP server running (NO TLS)\n\nAvailable endpoints:\n- POST /api/test-user\n- GET /api/users\n- POST /attack\n- /ws (WebSocket)"))
	})

	userServiceGorm := userservicegorm.NewUserService(dbConn)
	routeUser := routeuser.NewUserRoute(userServiceGorm)
	mux.HandleFunc("/api/create/user", routeUser.CreateUser)
	mux.HandleFunc("/api/login/user", routeUser.Login)

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		status := "healthy"
		if dbConn == nil {
			status = "healthy (no db)"
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "` + status + `", "timestamp": "` + time.Now().Format(time.RFC3339) + `"}`))
	})

	server := &http.Server{
		Addr:         ":8084",
		Handler:      corsMiddleware(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Println("🌐 HTTP server running on http://localhost:8084")
	log.Fatal(server.ListenAndServe())
}

func startWSServer(db *gorm.DB) {
	mux := http.NewServeMux()

	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		if r.TLS == nil {
			http.Error(w, "WSS only", http.StatusUpgradeRequired)
			return
		}

		conn, err := schemaapplication.Upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("WSS upgrade error:", err)
			return
		}
		defer conn.Close()

		schemaapplication.BroadcastAttack(w, r, conn)

		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				log.Println("WSS closed")
				break
			}
		}
	})

	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
		NextProtos: []string{"h2", "http/1.1"},
	}

	server := &http.Server{
		Addr:         ":8443",
		Handler:      corsMiddleware(mux),
		TLSConfig:    tlsConfig,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Println("🔐 WSS server running on wss://localhost:8443/ws")
	log.Fatal(server.ListenAndServeTLS("localhost.pem", "localhost-key.pem"))
}

func main() {

	dbConn := db.NewGORMConnection()
	log.Println("Connected to database via db package")

	dbConn.AutoMigrate(
		&entities.User{},
	)

	redisConnection := datastore.RedisConnect()
	log.Println("Success connect to redis", redisConnection)
	_, err := db.ConnectMongoDB()
	if err != nil {
		log.Fatal("error connect mongo", err)
	}
	log.Println("Success connect to mongo")
	log.Println("Database migration completed")

	startHTTPServer(dbConn)

	log.Println("Application started successfully!")
	log.Println("Health check: http://localhost:8084/health")
	// log.Println("🔌 WebSocket: ws://localhost:8084/ws")
	// log.Println("🔐 Secure WebSocket: wss://localhost:8443/ws")

	select {}

}
