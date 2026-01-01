import prisma from '@/lib/prisma';


// Default tags from the todo list
const defaultTags = [
  { name: 'Pickup', color: '#3b82f6' }, // Blue
  { name: 'Service', color: '#10b981' }, // Emerald
  { name: 'Delivery', color: '#8b5cf6' }, // Purple
  { name: 'CX Hold', color: '#f59e0b' }, // Amber
  { name: 'Supplier Hold', color: '#ef4444' }, // Red
  { name: 'Recurance', color: '#ec4899' }, // Pink
  { name: 'Developer Hold', color: '#6366f1' }, // Indigo
  { name: 'Spare Missing', color: '#64748b' }, // Slate
  { name: 'Video Call Tag', color: '#ef4444' } // Red (default for pending, will be conditional in UI)
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const createdTags = [];
    const existingTags = [];

    for (const tagData of defaultTags) {
      try {
        const tag = await prisma.tag.upsert({
          where: { name: tagData.name },
          update: {
            color: tagData.color
          },
          create: {
            name: tagData.name,
            color: tagData.color
          }
        });
        createdTags.push(tag);
      } catch (error) {
        if (error.code === 'P2002') {
          // Tag already exists
          const existing = await prisma.tag.findUnique({
            where: { name: tagData.name }
          });
          if (existing) {
            existingTags.push(existing);
          }
        } else {
          throw error;
        }
      }
    }

    return res.status(200).json({
      message: 'Tags seeded successfully',
      created: createdTags.length,
      existing: existingTags.length,
      tags: [...createdTags, ...existingTags]
    });
  } catch (error) {
    console.error('Error seeding tags:', error);
    return res.status(500).json({ message: 'Error seeding tags', error: error.message });
  }
}

