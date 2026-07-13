import prisma from "../../config/prisma";

interface CreateContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export class ContactService {
  async createMessage(input: CreateContactMessageInput) {
    return prisma.contactMessage.create({
      data: input,
    });
  }

  async getMessages() {
    return prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}

export const contactService = new ContactService();
