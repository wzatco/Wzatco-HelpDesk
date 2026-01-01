import prisma from '@/lib/prisma';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ customers: [] });
    }

    const searchTerm = q.trim().toLowerCase();
    
    // Search by name, email, or phone (case-insensitive for SQLite)
    // SQLite doesn't support mode: 'insensitive', so we'll fetch and filter
    const allCustomers = await prisma.customer.findMany({
      take: 50, // Get more results to filter client-side
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            conversations: {
              where: {
                status: { in: ['open', 'pending'] }
              }
            }
          }
        }
      }
    });

    // Filter case-insensitively
    const customers = allCustomers.filter(customer => {
      const name = (customer.name || '').toLowerCase();
      const email = (customer.email || '').toLowerCase();
      const phone = (customer.phone || '').toLowerCase();
      return name.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm);
    }).slice(0, 10);

    const result = customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      location: customer.location,
      company: customer.company,
      openTicketsCount: customer._count.conversations
    }));

    res.status(200).json({ customers: result });

  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}

