import { PubSub } from "graphql-subscriptions";

export const pubsub = new PubSub();

export const EVENTS = {
  CHAT_MESSAGE_CREATED: "CHAT_MESSAGE_CREATED",
};
