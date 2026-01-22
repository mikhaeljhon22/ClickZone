package schemaapplication

import (
	messagebroker "ClickZone/schema-application/message-broker"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type PlayerAttackData struct {
	AttackPoint int
	ClanColour  string
}

var (
	playerAttackMap     = make(map[string]PlayerAttackData)
	playerAttackMapLock sync.RWMutex
	rdb                 = messagebroker.RedisConnect()
)
var Upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func SendAttackClickBattle(w http.ResponseWriter, r *http.Request) {
	type Request struct {
		PlayerID    string `json:"player_id"`
		AttackPoint int    `json:"attack_point"`
		ClanColour  string `json:"clan_colour"`
	}

	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	playerAttackMapLock.Lock()
	playerAttackMap[req.PlayerID] = PlayerAttackData{
		AttackPoint: req.AttackPoint,
		ClanColour:  req.ClanColour,
	}
	channelName := req.PlayerID + "_attack"
	fmt.Printf("Type of channelName is %T\n", channelName)

	jsonMarshal, err := json.Marshal(map[string]interface{}{
		"player_id":    req.PlayerID,
		"attack_point": req.AttackPoint,
		"clan_colour":  req.ClanColour,
	})
	if err != nil {
		fmt.Println("error message to json marshal %v", err)
	}
	messagebroker.Publish(rdb, channelName, jsonMarshal)

	playerAttackMapLock.Unlock()
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":      "attack_received",
		"player":      req.PlayerID,
		"clan_colour": req.ClanColour,
	})
}
func BroadcastAttack(w http.ResponseWriter, r *http.Request, conn *websocket.Conn) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Private-Network", "true")
	playerID := r.URL.Query().Get("playerID")
	if playerID == "" {
		return
	}
	type Request struct {
		PlayerID    string `json:"player_id"`
		AttackPoint int    `json:"attack_point"`
		ClanColour  string `json:"clan_colour"`
	}

	channelName := playerID + "_attack"
	msgChan := messagebroker.Subscribe(rdb, channelName)

	for msg := range msgChan {
		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
			fmt.Println("Invalid JSON from Redis:", err)
			continue
		}

		if err := conn.WriteJSON(payload); err != nil {
			fmt.Println("WS write error:", err)
			return
		}

	}
}
