import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoute from "./auth/auth.routes";
import usersRoute from "./users/users.routes";
import dosenRoute from "./dosen/dosen.routes";
import swaggerUiDist from "swagger-ui-dist";
import { swaggerSpec } from "./docs/swagger";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

// middleware global
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use((req, _res, next) => {
  console.log("[INCOMING]", req.method, req.url);
  next();
});

app.use(
  "/swagger-ui",
  express.static(swaggerUiDist.getAbsoluteFSPath(), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
    },
  }),
);
app.get("/docs/swagger.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.get("/docs", (_req, res) => {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>SLK API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="/swagger-ui/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: "/docs/swagger.json",
        dom_id: "#swagger-ui",
        persistAuthorization: true
      })
    }
  </script>
</body>
</html>`;
  res.send(html);
});

// routes
app.use("/api", authRoute);
app.use("/api", usersRoute);
app.use("/api", dosenRoute);

// health check (penting buat test)
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
