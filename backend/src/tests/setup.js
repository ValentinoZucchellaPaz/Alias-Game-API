import { vi } from "vitest";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(() => "mockAccessToken"),
    verify: vi.fn(() => ({ id: 1 })),
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(() => true),
    hash: vi.fn(() => "mockHash"),
  },
}));

vi.mock("../config/redis.js", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("../repositories/user.repository.js", () => ({
  default: {
    findByEmail: vi.fn(),
    findByName: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../repositories/refresh.repository.js", () => ({
  default: {
    save: vi.fn(),
    exists: vi.fn(),
    revoke: vi.fn(),
  },
}));

vi.mock("../utils/jwt.js", () => ({
  default: {
    verifyRefreshToken: vi.fn(),
    generateAccessToken: vi.fn(() => "mockAccessToken"),
    generateRefreshToken: vi.fn(() => "mockRefreshToken"),
  },
}));
