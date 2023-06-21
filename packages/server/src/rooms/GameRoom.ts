import { Client, Room } from 'colyseus';
import { Constants, Maths, Models, Types } from '@tosios/common';
import { GameState } from '../states/GameState';

import { LobbyV2Api, RoomV1Api } from "@hathora/hathora-cloud-sdk";

export class GameRoom extends Room<GameState> {
    public appId = "app-0d55c264-15fa-43c7-af9f-be9f172f95a2"
    public developerToken = process.env.hathoradeveloperToken
    public lobbyClient = new LobbyV2Api();
    public roomClient = new RoomV1Api();

    //
    // Lifecycle
    //
    onCreate(options: Types.IRoomOptions) {
        this.roomId = options.hathoraId

        // Set max number of clients for this room
        this.maxClients = Maths.clamp(
            options.roomMaxPlayers || 0,
            Constants.ROOM_PLAYERS_MIN,
            Constants.ROOM_PLAYERS_MAX,
        );

        const playerName = options.playerName.slice(0, Constants.PLAYER_NAME_MAX);
        const roomName = options.roomName.slice(0, Constants.ROOM_NAME_MAX);

        // Init Metadata
        this.setMetadata({
            playerName,
            roomName,
            roomMap: options.roomMap,
            roomMaxPlayers: this.maxClients,
            mode: options.mode,
        });

        // Init State
        this.setState(new GameState(roomName, options.roomMap, this.maxClients, options.mode, this.handleMessage));

        this.setSimulationInterval(() => this.handleTick());

        console.log(
            `${new Date().toISOString()} [Create] player=${playerName} room=${roomName} map=${options.roomMap} max=${
                this.maxClients
            } mode=${options.mode}`,
        );

        // Listen to messages from clients
        this.onMessage('*', (client: Client, type: string | number, message: Models.ActionJSON) => {
            const playerId = client.sessionId;

            // Validate which type of message is accepted
            switch (type) {
                case 'move':
                case 'rotate':
                case 'shoot':
                    this.state.playerPushAction({
                        playerId,
                        ...message,
                    });
                    break;
                default:
                    break;
            }
        });
    }

    async onJoin(client: Client, options: Types.IPlayerOptions) {
        this.state.playerAdd(client.sessionId, options.playerName);

        console.log(`${new Date().toISOString()} [Join] id=${client.sessionId} player=${options.playerName}`);

        let myCustomLobbyState = { playerCount: this.clients.length}

        try{
        const lobby = await this.lobbyClient.setLobbyState(
            this.appId,
            this.roomId,
            { state: myCustomLobbyState },
            { headers: {
                Authorization: `Bearer ${this.developerToken}`,
                "Content-Type": "application/json"
            } }
            ); 
        }catch(error){
            console.error(error)
        }
        
    }

    async onLeave(client: Client) {
        this.state.playerRemove(client.sessionId);

        console.log(`${new Date().toISOString()} [Leave] id=${client.sessionId}`);

        let myCustomLobbyState = { playerCount: this.clients.length}

        try{
            const lobby = await this.lobbyClient.setLobbyState(
                this.appId,
                this.roomId,
                { state: myCustomLobbyState },
                { headers: {
                    Authorization: `Bearer ${this.developerToken}`,
                    "Content-Type": "application/json"
                } }
                ); 
            }catch(error){
                console.error(error)
            }
    }

    async onDispose () {
        try{
        const lobby = await this.roomClient.destroyRoom(
            this.appId,
            this.roomId,
            { headers: {
              Authorization: `Bearer ${this.developerToken}`,
              "Content-Type": "application/json"
            } }
          );
        }catch(error){
            console.error(error)
        }
    }

    //
    // Handlers
    //
    handleTick = () => {
        this.state.update();
    };

    handleMessage = (message: Models.MessageJSON) => {
        this.broadcast(message.type, message);
    };
}
