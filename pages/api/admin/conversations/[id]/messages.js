import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default async function handler(req, res) {
  const { id } = req.query
  try {
    const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' } })
    res.status(200).json({ data: messages })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server_error' })
  }
}
