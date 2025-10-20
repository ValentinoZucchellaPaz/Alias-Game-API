// src/sockets/index.js

import setupDefaultNamespace from "./default.js";

/**
 * Initialize the application's Socket.IO namespaces.
 *
 * Delegates to the namespace-specific setup helpers to register and configure
 * the admin, default, and user namespaces on the provided Socket.IO server
 * instance.
 *
 * @param {import("socket.io").Server} io - The Socket.IO server instance to attach namespaces to.
 * @returns {void}
 */
export function setupNamespaces(io) {
  setupDefaultNamespace(io);
}
