import { LobbyV2Api, RoomV1Api, AuthV1Api} from "@hathora/hathora-cloud-sdk";

export const lobbyClient = new LobbyV2Api();
export const roomClient = new RoomV1Api();
export const authClient = new AuthV1Api();
export const HATHORA_APP_ID = "app-0d55c264-15fa-43c7-af9f-be9f172f95a2";

export type LobbyState = { playerCount: number };
export type LobbyInitialConfig = { roomName: string, mapName: string, maxClients: number, mode: string };

const getPing = async () => {
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
}

  export const createLobby = async (initialConfig: LobbyInitialConfig) => {
    let pingRegion = await getPing()

    const playerToken = (await (authClient.loginAnonymous(HATHORA_APP_ID))).token;
    return await lobbyClient.createLobby(
        HATHORA_APP_ID,
        playerToken,
        {
          visibility: "public",
          region: pingRegion,
          initialConfig,
        },
    );
}

const getHathoraConnectionInfo = async (roomId: string) => {
    let info = await roomClient.getConnectionInfo(
        HATHORA_APP_ID,
        roomId,
    );
    
    if (info === undefined){
        return undefined;
    } 

    return info;

}

export const pollConnectionInfo = async (roomId: string) => {
    let result;

    while (result === undefined || result.status === 'starting' ) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        result = await getHathoraConnectionInfo(roomId);
    }
    
    return result;
}

export const hathoraSetLobbyState = async (roomId: string, playerCount: number) => {
    await lobbyClient.setLobbyState(
        HATHORA_APP_ID,
        roomId,
        { state: { playerCount } },
        { headers: {
          Authorization: `Bearer ${process.env.HATHORA_DEVELOPER_TOKEN}`,
          "Content-Type": "application/json"
        } }
    );
}

export const hathoraDestroyLobby = async (roomId: string) => {
    await roomClient.destroyRoom(
        HATHORA_APP_ID,
        roomId,
        { headers: {
          Authorization: `Bearer ${process.env.HATHORA_DEVELOPER_TOKEN}`,
          "Content-Type": "application/json"
        } }
    );
}
