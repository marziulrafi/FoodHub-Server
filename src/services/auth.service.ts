import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt.utils.js';
import { z } from 'zod';

const prisma = new PrismaClient();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['CUSTOMER', 'PROVIDER']),
});

export async function register(data: unknown) {
    const validated = registerSchema.parse(data);
    const hashed = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
        data: {
            email: validated.email,
            password: hashed,
            role: validated.role,
            profile: { create: { name: validated.email.split('@')[0] } },
        },
    });

    const token = signToken({ id: user.id, role: user.role });
    return { user: { id: user.id, email: user.email, role: user.role }, token };
}

export async function login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error('Invalid credentials');

    const token = signToken({ id: user.id, role: user.role });
    return { user: { id: user.id, email: user.email, role: user.role }, token };
}