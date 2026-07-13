import { Request, Response } from "express";
import { contactService } from "./contact.service";
import { sendSuccess, sendError } from "../../utils/response";

export class ContactController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const contact = await contactService.createMessage(req.body);
      sendSuccess(res, "Message submitted successfully.", contact, 201);
    } catch (err: any) {
      sendError(res, err.message || "Failed to submit message.", err.statusCode || 500);
    }
  }

  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const messages = await contactService.getMessages();
      sendSuccess(res, "Messages retrieved successfully.", messages);
    } catch (err: any) {
      sendError(res, err.message || "Failed to retrieve messages.", err.statusCode || 500);
    }
  }
}

export const contactController = new ContactController();
