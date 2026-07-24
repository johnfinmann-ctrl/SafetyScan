import { z } from 'zod'

export const roleSchema = z.enum(['employee', 'manager', 'admin'])

export const inviteUserSchema = z.object({
  email: z.string().email('Ugyldig e-mailadresse'),
  full_name: z.string().min(2, 'Navn skal være mindst 2 tegn').max(100),
  role: roleSchema,
  organization_id: z.string().uuid(),
})

export const changeRoleSchema = z.object({
  user_id: z.string().uuid(),
  new_role: roleSchema,
})

export const deactivateUserSchema = z.object({
  user_id: z.string().uuid(),
})

export const loginSchema = z.object({
  email: z.string().email('Ugyldig e-mailadresse'),
  password: z.string().min(1, 'Adgangskode er påkrævet'),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>
export type LoginInput = z.infer<typeof loginSchema>
