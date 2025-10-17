import { describe, it, expect, vi } from "vitest";
import userRepository from "../repositories/user.repository.js";
import refreshRepository from "../repositories/refresh.repository.js";
import authService from "../services/auth.service.js";
import { ConflictError, AuthError } from "../utils/errors.js";
import bcrypt from "bcrypt";
import jwt from "../utils/jwt.js";

describe("AuthService - register", () => {
  it("Successful user creation", async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByName.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "John",
      email: "john@example.com",
    });

    const user = await authService.register({
      name: "John",
      email: "john@example.com",
      password: "123456",
      role: "player",
    });

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "john@example.com",
        password: "mockHash",
      })
    );
    expect(user).toHaveProperty("email", "john@example.com");
  });

  it("Email already in use exception", async () => {
    userRepository.findByEmail.mockResolvedValue({ id: 99 });

    await expect(
      authService.register({
        name: "Jane",
        email: "jane@x.com",
        password: "123456",
        role: "player",
      })
    ).rejects.toThrow(ConflictError);
  });

  it("Name already in use exception", async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByName.mockResolvedValue({ id: 2 });

    await expect(
      authService.register({
        name: "Jane",
        email: "jane@x.com",
        password: "123456",
        role: "player",
      })
    ).rejects.toThrow(ConflictError);
  });
});

describe("AuthService - login", () => {
  const mockUser = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "John Doe",
    email: "john@example.com",
    role: "player",
    password: "hashedPassword",
  };

  it("Correct credentials, returns access token and refresh in cookie", async () => {
    userRepository.findByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    refreshRepository.save.mockResolvedValue();

    const result = await authService.login({ email: "john@example.com", password: "123456" });

    expect(result.accessToken).toBe("mockAccessToken");
    expect(result.refreshToken).toBe("mockRefreshToken");
    expect(refreshRepository.save).toHaveBeenCalledWith(mockUser.id, "mockRefreshToken");
  });

  it("User doesn't exists, AuthError", async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({ email: "wrong@example.com", password: "123456" })
    ).rejects.toThrow(AuthError);
  });

  it("Wrong password, AuthError", async () => {
    userRepository.findByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      authService.login({ email: "john@example.com", password: "wrongpass" })
    ).rejects.toThrow(AuthError);
  });
});

describe("AuthService - validateAndRotateToken", () => {
  const payload = { id: 1, name: "John Doe", role: "player" };
  const oldToken = "oldRefreshToken";

  it("Valid Refresh Token", async () => {
    jwt.verifyRefreshToken.mockReturnValue(payload);
    refreshRepository.exists.mockResolvedValue(true);
    refreshRepository.save.mockResolvedValue();

    const tokens = await authService.validateAndRotateToken(oldToken);

    expect(tokens.accessToken).toBe("mockAccessToken");
    expect(tokens.refreshToken).toBe("mockRefreshToken");
    expect(refreshRepository.save).toHaveBeenCalledWith(payload.id, "mockRefreshToken");
  });

  it("Invalid/expired Refresh Token", async () => {
    jwt.verifyRefreshToken.mockReturnValue(null);

    await expect(authService.validateAndRotateToken("invalidToken")).rejects.toThrow(
      "Invalid or expired refresh token"
    );
  });

  it("Does not exists in Redis", async () => {
    jwt.verifyRefreshToken.mockReturnValue(payload);
    refreshRepository.exists.mockResolvedValue(false);

    await expect(authService.validateAndRotateToken(oldToken)).rejects.toThrow(
      "Invalid refresh token"
    );
  });
});
