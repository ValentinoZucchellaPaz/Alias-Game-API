import { z } from "zod";

export const UserRoleEnum = z.enum(["admin", "player"]).default("player").meta({
  // meta is for openapi documentation
  description: "User roles",
  example: "player",
});

export const UserSchema = z.object({
  id: z.uuid().meta({ example: "550e8400-e29b-41d4-a716-446655440000" }),
  name: z.string().min(2).meta({ example: "Admin" }),
  email: z.email().meta({ example: "admin@example.com" }),
  password_hash: z.string(),
  role: UserRoleEnum,
  active: z
    .union([z.boolean(), z.number()])
    .transform((val) => Boolean(val)) // converts 0/1 -> false/true
    .meta({ example: true }),
  created_at: z
    .union([z.string(), z.instanceof(Date)])
    .transform((val) => new Date(val).toISOString())
    .meta({ example: "2025-08-26T10:00:00Z" }),
});

export const PublicUserSchema = UserSchema.omit({ password_hash: true });
export const CreateUserSchema = UserSchema.omit({
  id: true,
  active: true,
  created_at: true,
});
export const UserRegisterResponse = UserSchema.omit({
  password_hash: true,
  active: true,
  created_at: true,
}).meta({
  id: "UserRegisterResponseDTO",
});

export const UserRegisterRequest = z
  .object({
    name: z.string().min(2).meta({ description: "Name", example: "John Doe" }),
    email: z.email().meta({ example: "example@gmail.com" }),
    password: z.string().min(6),
    role: UserRoleEnum,
  })
  .meta({
    id: "UserRegisterRequestDTO",
  });

export const UserLoginRequest = z
  .object({
    email: z.email().meta({ example: "admin@example.com" }),
    password: z.string().min(6).meta("123456"),
  })
  .meta({
    id: "UserLoginRequestDTO",
  });
