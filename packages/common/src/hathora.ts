export const authHathora = async (obj) => {
    if (obj.token != undefined){
        return;
    }
    obj.token = await obj.authClient.loginAnonymous(obj.appId);
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
    if (obj.token == undefined) {
        return;
    }
    let pingRegion = await getPing()

    const lobby = await obj.lobbyClient.createLobby(
        obj.appId,
        obj.token.token,
        {
          visibility: "public",
          region: pingRegion,
          initialConfig: {roomName: obj.state.roomName, mapName: obj.roomCreatedMap, clients: 0, maxClients: obj.state.roomMaxPlayers, mode: obj.roomCreatedMode},
        },
    )
    
    obj.setState({hathoraId: lobby.roomId})
    obj.roomCreated = true
}

const getHathoraConnectionInfo = async (obj, definedRoomId) => {
    let info = await obj.roomClient.getConnectionInfo(
        obj.appId,
        definedRoomId,
    );
    
    if (info === undefined){
        return undefined;
    } 

    return info;

}

export const pollConnectionInfo = async (obj, definedRoomId) => {
    let result;

    while (result === undefined || result.status === 'starting' ) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        result = await getHathoraConnectionInfo(obj, definedRoomId);
    }
    
    return result;
}