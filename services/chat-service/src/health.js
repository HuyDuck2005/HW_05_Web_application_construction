export function registerHealthRoutes(app) {
  app.get("/health", (req, res) => {
    res.json({
      service: "chat-service",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });
}
