import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default async function handler(req, res) {
  try {
    const list = await prisma.conversation.findMany({ orderBy: { lastMessageAt: 'desc' }, take: 50 })
    res.status(200).json({ data: list })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server_error' })
  }
}
