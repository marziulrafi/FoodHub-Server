import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;

export function signToken(payload: object): string {
    return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): any {
    return jwt.verify(token, SECRET);
}