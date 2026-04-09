import { auth } from "../../config/auth";
import prisma from "../../config/prisma";
import { Role } from "@prisma/client";

interface RegisterInput {
    name: string;
    email: string;
    password: string;
    role: Role;
    restaurantName?: string;
    address?: string;
    restaurantAddress?: string;
    phone?: string;
    restaurantPhone?: string;
    city?: string;
    restaurantCity?: string;
    description?: string;
    logo?: string;
}

interface UpdateProfileInput {
    name?: string;
    phone?: string;
    address?: string;
    image?: string;
}

export class AuthService {
    async register(input: RegisterInput) {
        const {
            name,
            email,
            password,
            role,
            restaurantName,
            address,
            restaurantAddress,
            phone,
            restaurantPhone,
            city,
            restaurantCity,
            description,
            logo,
        } = input;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw { statusCode: 409, message: "Email already registered." };
        }

        if (role === "PROVIDER") {
            const resolvedAddress = address ?? restaurantAddress;
            const resolvedPhone = phone ?? restaurantPhone;
            if (!restaurantName || !resolvedAddress || !resolvedPhone) {
                throw {
                    statusCode: 422,
                    message:
                        "Provider registration requires: restaurantName, address, phone.",
                };
            }
        }

        const authResult = await auth.api.signUpEmail({
            body: { name, email, password },
        });

        if (!authResult?.user) {
            throw { statusCode: 500, message: "Registration failed. Please try again." };
        }

        const user = await prisma.user.update({
            where: { id: authResult.user.id },
            data: {
                role: role ?? "CUSTOMER",
                emailVerified: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
            },
        });

        if (role === "PROVIDER") {
            const resolvedAddress = address ?? restaurantAddress!;
            const resolvedPhone = phone ?? restaurantPhone!;
            const resolvedCity = city ?? restaurantCity;

            const providerProfileData: any = {
                userId: user.id,
                restaurantName: restaurantName!,
                address: resolvedAddress,
                phone: resolvedPhone,
                cuisineTypes: [],
                status: "PENDING",
                isVerified: false,
            };

            if (description) providerProfileData.description = description;
            if (logo) providerProfileData.logo = logo;
            if (resolvedCity) providerProfileData.city = resolvedCity;

            await prisma.providerProfile.create({ data: providerProfileData });
        }

        return user;
    }

    async login(email: string, password: string, headers: any) {
        if (!email || !password) {
            throw { statusCode: 422, message: "Email and password are required." };
        }

        const result = await auth.api.signInEmail({
            body: { email, password },
            asResponse: true,
        });

        if (!result.ok) {
            const body = await result.json().catch(() => ({}));
            throw {
                statusCode: 401,
                message: (body as any)?.message || "Invalid credentials.",
            };
        }

        const body = await result.json();
        const setCookie = result.headers.get("set-cookie");

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                image: true,
                phone: true,
                address: true,
            },
        });

        if (!user) throw { statusCode: 401, message: "User not found." };

        if (user.status === "SUSPENDED") {
            throw {
                statusCode: 403,
                message: "Your account has been suspended. Contact support.",
            };
        }

        return { user, token: (body as any)?.token, setCookie };
    }

    async logout(headers: any) {
        await auth.api.signOut({ headers, asResponse: false });
    }

    async getMe(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                image: true,
                phone: true,
                address: true,
                createdAt: true,
                providerProfile: {
                    select: {
                        id: true,
                        restaurantName: true,
                        description: true,
                        logo: true,
                        banner: true,
                        cuisineTypes: true,
                        address: true,
                        city: true,
                        phone: true,
                        isVerified: true,
                        rating: true,
                        totalOrders: true,
                    },
                },
            },
        });

        if (!user) throw { statusCode: 404, message: "User not found." };
        return user;
    }

    async updateProfile(userId: string, data: UpdateProfileInput) {
        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                image: true,
                phone: true,
                address: true,
            },
        });
        return user;
    }
}

export const authService = new AuthService();