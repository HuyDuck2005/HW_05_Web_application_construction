import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { registerHealthRoutes } from "./health.js";
import { chatGrpcHandlers } from "./chatGrpcHandlers.js";

const PORT = Number(process.env.PORT ?? 3005);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 50054);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.resolve(__dirname, "../../../protos/chat.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const app = express();

registerHealthRoutes(app);

app.listen(PORT, () => {
  console.log(`[chat-service] health listening on ${PORT}`);
});

const grpcServer = new grpc.Server();
grpcServer.addService(proto.chat.ChatService.service, chatGrpcHandlers);

grpcServer.bindAsync(
  `0.0.0.0:${GRPC_PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error(`[chat-service] gRPC bind error:`, error);
      process.exit(1);
    }
    grpcServer.start();
    console.log(`[chat-service] gRPC listening on port ${port}`);
  }
);
