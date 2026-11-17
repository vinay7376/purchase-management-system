import { AIService } from '../services/aiService.js';
import { Item } from '../models/Item.js';
import { PurchaseRequisition } from '../models/PurchaseRequisition.js';

export class ChatController {
  /**
   * POST /api/chat/intake
   */
  static async intakeMessage(req, res) {
    try {
      const { message, currentState } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message string is required.' });
      }

      const items = await Item.find().lean();
      const updatedState = AIService.processChatIntake(
        message,
        currentState || {},
        items
      );

      return res.json(updatedState);
    } catch (err) {
      console.error('[ChatController] Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/chat/create-pr
   */
  static async createPRFromChat(req, res) {
    try {
      const state = req.body;

      if (!state.isComplete) {
        return res.status(400).json({
          error: 'Cannot create PR. Information is incomplete.',
          missingFields: state.missingFields,
        });
      }

      // Generate PR number
      const count = await PurchaseRequisition.countDocuments();
      const prNo = `PR-CHAT-${String(count + 1).padStart(5, '0')}`;

      const newPR = await PurchaseRequisition.create({
        pr_no: prNo,
        pr_line: 1,
        created_at: new Date(),
        requester: req.body.requester || 'Employee (Chat Intake)',
        department: req.body.department || 'Operations',
        plant: state.plant,
        item_code: state.matchedItemCode || undefined,
        description: state.itemDescription || 'Requisition via Chat',
        quantity: state.quantity,
        uom: state.uom || 'NOS',
        estimated_unit_price: state.estimated_unit_price,
        need_by_date: state.need_by_date,
        urgency: state.urgency || 'Normal',
        status: 'PENDING',
      });

      return res.json({
        success: true,
        message: `Purchase Requisition ${prNo} successfully raised!`,
        pr: newPR,
      });
    } catch (err) {
      console.error('[ChatController] Error creating PR:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
