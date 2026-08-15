// Multiplayer needs the long-lived WebSocket server in server.ts. Serverless
// hosts (Vercel among them) cannot keep a socket open or share the in-memory
// room map between instances, so the mode stays hidden unless something is
// actually running that server.
//
// Set VITE_ENABLE_MULTIPLAYER=true when deploying somewhere that runs
// `npm start` as a persistent process.
export const MULTIPLAYER_ENABLED =
  import.meta.env.VITE_ENABLE_MULTIPLAYER === 'true';
