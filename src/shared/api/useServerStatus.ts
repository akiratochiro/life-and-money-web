import { useSyncExternalStore } from "react";
import { serverWake, type ServerStatus } from "./serverWake";

export function useServerStatus(): ServerStatus {
  return useSyncExternalStore(serverWake.subscribe, serverWake.getStatus);
}
