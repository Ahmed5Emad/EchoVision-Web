import { serve } from "bun";
import index from "./index.html";

const server = serve({
  port: 8080, // Default web port
  routes: {
    "/*": index,
    "/ws": async (req) => {
      // Proxy websocket upgrade request to backend
      const backendUrl = "ws://localhost:3000/ws";
      console.log(`Proxying WS connection to ${backendUrl}`);
      // Note: Bun's serve doesn't have a built-in proxy utility for WS upgrades easily in this mode without manual handling.
      // However, for simplicity in this "embedded glass" context, the frontend should likely connect directly to the server's IP/port.
      // For now, let's just return 404 here and let the frontend connect directly.
      // Wait, the frontend code connects to `${window.location.protocol}//${window.location.host}/ws`.
      // We need to change the frontend to point to port 3000.
      return new Response("Use port 3000 for WebSocket", { status: 426 });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Web Server running at http://localhost:${server.port}`);
console.log(`ℹ️  Ensure the Whisper Server is running on port 3000`);
