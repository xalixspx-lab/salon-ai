import { prisma } from '@/lib/prisma';

export const SENDER_ROLE = { CUSTOMER: 'CUSTOMER', OWNER: 'OWNER' } as const;
export type SenderRole = (typeof SENDER_ROLE)[keyof typeof SENDER_ROLE];

export const MESSAGE_MAX_LENGTH = 2000;

// يرسل رسالة داخل محادثة قائمة ويحدّث وقت آخر رسالة بها في معاملة واحدة —
// مشتركة بين مسار المالك ومسار العميل حتى لا يتكرر منطق التحديث الذرّي
export async function sendMessage(conversationId: string, tenantId: string, senderRole: SenderRole, body: string) {
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, tenantId, senderRole, body } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ]);
  return message;
}
