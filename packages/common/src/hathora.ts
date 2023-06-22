import { LobbyV2Api, RoomV1Api, AuthV1Api} from "@hathora/hathora-cloud-sdk";

export const lobbyClient = new LobbyV2Api();
export const roomClient = new RoomV1Api();
export const authClient = new AuthV1Api();
export const appId = "app-0d55c264-15fa-43c7-af9f-be9f172f95a2"
export var token;
export const developerToken = process.env.hathoradeveloperToken

export const authHathora = async () => {
    if (token != undefined){
        return;
    }
    token = await authClient.loginAnonymous(appId);
}

const getPing = async () => {
    try {
      const response = await fetch('https://api.hathora.dev/discovery/v1/ping');
  
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
  
      const data = await response.json();
  
      const connectionPromises = data.map(({ region, host, port }) => {
        return new Promise(async (resolve) => {
          const pingUrl = `wss://${host}:${port}`;
          const socket = new WebSocket(pingUrl);
  
          socket.addEventListener('open', () => {
            resolve({ region });
            socket.close();
          });
        });
      });

      const { region } = await Promise.race(connectionPromises);

      return region;
    } catch (error) {
      console.error(error);
    }
  }

  export const createLobby = async (obj) => {
    if (token == undefined) {
        return;
    }
    let pingRegion = await getPing()

    const lobby = await lobbyClient.createLobby(
        appId,
        token.token,
        {
          visibility: "public",
          region: pingRegion,
          initialConfig: {roomName: obj.state.roomName, mapName: obj.roomCreatedMap, clients: 0, maxClients: obj.state.roomMaxPlayers, mode: obj.roomCreatedMode},
        },
    )
    
    obj.setState({hathoraId: lobby.roomId})
    obj.roomCreated = true
}

const getHathoraConnectionInfo = async (definedRoomId) => {
    let info = await roomClient.getConnectionInfo(
        appId,
        definedRoomId,
    );
    
    if (info === undefined){
        return undefined;
    } 

    return info;

}

export const pollConnectionInfo = async (definedRoomId) => {
    let result;

    while (result === undefined || result.status === 'starting' ) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        result = await getHathoraConnectionInfo(definedRoomId);
    }
    
    return result;
}

export const hathoraSetLobbyState = async (roomId, clientslength) => {
  let myCustomLobbyState = { playerCount: clientslength}

  try{
  const lobby = await lobbyClient.setLobbyState(
      appId,
      roomId,
      { state: myCustomLobbyState },
      { headers: {
          Authorization: `Bearer ${developerToken}`,
          "Content-Type": "application/json"
      } }
      ); 
  }catch(error){
      console.error(error)
  }
}

export const hathoraDestroyLobby = async (roomId) => {
  try{
    const lobby = await roomClient.destroyRoom(
        appId,
        roomId,
        { headers: {
          Authorization: `Bearer ${developerToken}`,
          "Content-Type": "application/json"
        } }
      );
    }catch(error){
        console.error(error)
    }
}