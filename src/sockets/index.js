// src/sockets/index.js

import setupAdminNamespace from "./admin.js";
import setupDefaultNamespace from "./default.js";

export function setupNamespaces(io) {
  setupAdminNamespace(io);
  setupDefaultNamespace(io);
}
