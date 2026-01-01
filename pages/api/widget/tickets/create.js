// Widget API - Create ticket with all form fields
import prisma, { ensurePrismaConnected } from '@/lib/prisma';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
  }
  prisma = global.prisma;
}

// Generate ticket number in format: TKT-YYMM-DD-{3 random uppercase letters}
// Example: TKT-2512-12-SRB
function generateTicketNumber() {
  const prefix = 'TKT';
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year (YY)
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // MM
  const day = now.getDate().toString().padStart(2, '0'); // DD
  
  // Generate 3 random uppercase letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetters = Array.from({ length: 3 }, () => 
    letters[Math.floor(Math.random() * letters.length)]
  ).join('');
  
  return `${prefix}-${year}${month}-${day}-${randomLetters}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await ensurePrismaConnected();
    // Parse form data (handles both regular fields and file uploads)
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'public', 'uploads', 'tickets'),
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB per file
      multiples: true,
    });

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tickets');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const [fields, files] = await form.parse(req);

    // Extract form fields
    const subject = Array.isArray(fields.subject) ? fields.subject[0] : fields.subject;
    const priority = Array.isArray(fields.priority) ? fields.priority[0] : fields.priority || 'medium';
    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
    const phone = Array.isArray(fields.phone) ? fields.phone[0] : fields.phone;
    const altPhone = Array.isArray(fields.altPhone) ? fields.altPhone[0] : fields.altPhone;
    const address = Array.isArray(fields.address) ? fields.address[0] : fields.address;
    const orderNumber = Array.isArray(fields.orderNumber) ? fields.orderNumber[0] : fields.orderNumber;
    const purchasedFrom = Array.isArray(fields.purchasedFrom) ? fields.purchasedFrom[0] : fields.purchasedFrom;
    let ticketBody = Array.isArray(fields.ticketBody) ? fields.ticketBody[0] : fields.ticketBody;
    const issueVideoLink = Array.isArray(fields.issueVideoLink) ? fields.issueVideoLink[0] : fields.issueVideoLink;
    const issueType = Array.isArray(fields.issueType) ? fields.issueType[0] : fields.issueType;
    const productId = Array.isArray(fields.productId) ? fields.productId[0] : fields.productId;
    const accessoryId = Array.isArray(fields.accessoryId) ? fields.accessoryId[0] : fields.accessoryId;
    // Support custom product/accessory names when IDs are not provided
    const customProductName = Array.isArray(fields.customProductName) ? fields.customProductName[0] : fields.customProductName;
    const customProductNameAlt = Array.isArray(fields.productName) ? fields.productName[0] : fields.productName; // Alternative field name
    const customAccessoryName = Array.isArray(fields.customAccessoryName) ? fields.customAccessoryName[0] : fields.customAccessoryName;
    const customAccessoryNameAlt = Array.isArray(fields.accessoryName) ? fields.accessoryName[0] : fields.accessoryName; // Alternative field name

    // Validate required fields
    if (!subject || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Subject, email, and name are required'
      });
    }

    // Handle file uploads
    let invoiceUrl = null;
    const additionalDocuments = [];

    // Process invoice (single file)
    if (files.invoice) {
      const invoiceFile = Array.isArray(files.invoice) ? files.invoice[0] : files.invoice;
      const timestamp = Date.now();
      const originalName = invoiceFile.originalFilename || 'invoice';
      const ext = path.extname(originalName);
      const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueFilename = `invoice_${timestamp}_${baseName}${ext}`;
      const newPath = path.join(uploadsDir, uniqueFilename);
      
      fs.renameSync(invoiceFile.filepath, newPath);
      invoiceUrl = `/uploads/tickets/${uniqueFilename}`;
    }

    // Process additional documents (max 5 files)
    if (files.additionalDocuments) {
      const docFiles = Array.isArray(files.additionalDocuments) ? files.additionalDocuments : [files.additionalDocuments];
      const docsToProcess = docFiles.slice(0, 5); // Limit to 5 files
      
      for (const docFile of docsToProcess) {
        const timestamp = Date.now();
        const originalName = docFile.originalFilename || 'document';
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
        const uniqueFilename = `doc_${timestamp}_${baseName}${ext}`;
        const newPath = path.join(uploadsDir, uniqueFilename);
        
        fs.renameSync(docFile.filepath, newPath);
        additionalDocuments.push({
          url: `/uploads/tickets/${uniqueFilename}`,
          fileName: originalName,
          mimeType: docFile.mimetype || 'application/octet-stream',
          size: docFile.size || 0
        });
      }
    }

    // Process projector images (exactly 4 images)
    const projectorImagesUrls = [];
    if (files.projectorImages) {
      const imageFiles = Array.isArray(files.projectorImages) ? files.projectorImages : [files.projectorImages];
      const imagesToProcess = imageFiles.slice(0, 4); // Limit to 4 files
      
      console.log(`[Ticket Create] Processing ${imagesToProcess.length} projector images`);
      
      const sideNames = ['front', 'back', 'left', 'right'];
      for (let i = 0; i < imagesToProcess.length; i++) {
        const imageFile = imagesToProcess[i];
        const timestamp = Date.now();
        const sideName = sideNames[i] || `side${i + 1}`;
        const ext = path.extname(imageFile.originalFilename || '.jpg');
        const uniqueFilename = `projector_${sideName}_${timestamp}${ext}`;
        const newPath = path.join(uploadsDir, uniqueFilename);
        
        fs.renameSync(imageFile.filepath, newPath);
        projectorImagesUrls.push(`/uploads/tickets/${uniqueFilename}`);
        console.log(`[Ticket Create] Saved projector image ${i + 1}: ${uniqueFilename}`);
      }
    } else {
      console.log('[Ticket Create] No projector images found in request');
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { email: email.toLowerCase().trim() }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          phone: phone || null
        }
      });

      // Trigger webhook for customer creation
      try {
        const { triggerWebhook } = await import('../../../../lib/utils/webhooks');
        await triggerWebhook('customer.created', {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            location: customer.location,
            createdAt: customer.createdAt
          }
        });
      } catch (webhookError) {
        console.error('Error triggering customer.created webhook:', webhookError);
        // Don't fail ticket creation if webhook fails
      }
    } else {
      // Update customer info if provided
      const oldCustomer = { ...customer };
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: name.trim(),
          phone: phone || customer.phone
        }
      });

      // Trigger webhook for customer update
      try {
        const { triggerWebhook } = await import('../../../../lib/utils/webhooks');
        await triggerWebhook('customer.updated', {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            location: customer.location,
            updatedAt: customer.updatedAt
          },
          changes: {
            name: oldCustomer.name !== customer.name,
            phone: oldCustomer.phone !== customer.phone
          }
        });
      } catch (webhookError) {
        console.error('Error triggering customer.updated webhook:', webhookError);
        // Don't fail ticket creation if webhook fails
      }
    }

    // Generate ticket number
    const ticketNumber = generateTicketNumber();

    // Validate and resolve foreign key references
    let validProductId = null;
    let validAccessoryId = null;
    let customProductModel = null;
    let customAccessoryInfo = null;

    // Handle Product: Check if productId is valid, otherwise treat it as custom product name
    if (productId && productId.trim() !== '') {
      // Check if it looks like a valid ID (cuid format: starts with 'c' and is ~25 chars) or UUID
      const looksLikeId = /^[a-z0-9]{24,26}$/i.test(productId.trim()) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId.trim());
      
      if (looksLikeId) {
        // Try to find product by ID
        try {
          const product = await prisma.product.findUnique({
            where: { id: productId.trim() },
            select: { id: true, name: true }
          });
          if (product) {
            validProductId = productId.trim();
          } else {
            // ID format but not found - check for custom name or use productId as name
            const productName = customProductName || customProductNameAlt || productId.trim();
            console.log(`[Ticket Create] Product ID not found: ${productId}, using as custom product name: ${productName}`);
            customProductModel = productName;
          }
        } catch (error) {
          console.warn(`[Ticket Create] Error validating productId: ${productId}`, error);
          // On error, treat as custom name
          const productName = customProductName || customProductNameAlt || productId.trim();
          customProductModel = productName;
        }
      } else {
        // Doesn't look like an ID - treat as custom product name
        const productName = customProductName || customProductNameAlt || productId.trim();
        console.log(`[Ticket Create] Product field doesn't look like ID, treating as custom name: ${productName}`);
        customProductModel = productName;
      }
    } else {
      // No productId provided - use custom product name if available
      const productName = customProductName || customProductNameAlt;
      if (productName && productName.trim() !== '') {
        console.log(`[Ticket Create] No productId provided, using custom product name: ${productName}`);
        customProductModel = productName.trim();
      }
    }

    // Handle Accessory: Check if accessoryId is valid, otherwise treat it as custom accessory name
    if (accessoryId && accessoryId.trim() !== '') {
      // Check if it looks like a valid ID (cuid format: starts with 'c' and is ~25 chars) or UUID
      const looksLikeId = /^[a-z0-9]{24,26}$/i.test(accessoryId.trim()) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accessoryId.trim());
      
      if (looksLikeId) {
        // Try to find accessory by ID
        try {
          const accessory = await prisma.accessory.findUnique({
            where: { id: accessoryId.trim() },
            select: { id: true, name: true }
          });
          if (accessory) {
            validAccessoryId = accessoryId.trim();
          } else {
            // ID format but not found - check for custom name or use accessoryId as name
            const accessoryName = customAccessoryName || customAccessoryNameAlt || accessoryId.trim();
            console.log(`[Ticket Create] Accessory ID not found: ${accessoryId}, using as custom accessory name: ${accessoryName}`);
            customAccessoryInfo = accessoryName;
          }
        } catch (error) {
          console.warn(`[Ticket Create] Error validating accessoryId: ${accessoryId}`, error);
          // On error, treat as custom name
          const accessoryName = customAccessoryName || customAccessoryNameAlt || accessoryId.trim();
          customAccessoryInfo = accessoryName;
        }
      } else {
        // Doesn't look like an ID - treat as custom accessory name
        const accessoryName = customAccessoryName || customAccessoryNameAlt || accessoryId.trim();
        console.log(`[Ticket Create] Accessory field doesn't look like ID, treating as custom name: ${accessoryName}`);
        customAccessoryInfo = accessoryName;
      }
    } else {
      // No accessoryId provided - use custom accessory name if available
      const accessoryName = customAccessoryName || customAccessoryNameAlt;
      if (accessoryName && accessoryName.trim() !== '') {
        console.log(`[Ticket Create] No accessoryId provided, using custom accessory name: ${accessoryName}`);
        customAccessoryInfo = accessoryName.trim();
      }
    }

    // If custom accessory name exists but no field to store it, append to ticket body
    if (customAccessoryInfo && !validAccessoryId) {
      const accessoryNote = `\n\n[Custom Accessory: ${customAccessoryInfo}]`;
      ticketBody = (ticketBody || '') + accessoryNote;
    }

    // Normalize priority to valid values (high, medium, low)
    const normalizedPriority = (() => {
      const p = (priority || 'medium').toLowerCase().trim();
      if (['high', 'medium', 'low'].includes(p)) {
        return p;
      }
      return 'medium'; // Default fallback
    })();

    // Normalize status to valid values
    const normalizedStatus = 'open'; // Default status for new tickets

    // Log projector images before saving
    console.log(`[Ticket Create] Projector Images URLs: ${JSON.stringify(projectorImagesUrls)}`);
    console.log(`[Ticket Create] Projector Images to save: ${projectorImagesUrls.length > 0 ? JSON.stringify(projectorImagesUrls) : null}`);

    // Create ticket (conversation) with all fields
    const ticket = await prisma.conversation.create({
      data: {
        customerId: customer.id,
        siteId: 'widget',
        subject: subject.trim(),
        status: normalizedStatus,
        priority: normalizedPriority,
        customerName: name.trim(),
        customerEmail: email.toLowerCase().trim(),
        customerPhone: phone || null,
        customerAltPhone: altPhone || null,
        customerAddress: address || null,
        orderNumber: orderNumber || null,
        purchasedFrom: purchasedFrom || null,
        ticketBody: ticketBody || null,
        invoiceUrl: invoiceUrl,
        additionalDocuments: additionalDocuments.length > 0 ? JSON.stringify(additionalDocuments) : null,
        projectorImages: projectorImagesUrls.length > 0 ? JSON.stringify(projectorImagesUrls) : null,
        issueVideoLink: issueVideoLink || null,
        issueType: issueType || null,
        productId: validProductId,
        productModel: customProductModel || null, // Store custom product name if no valid productId
        accessoryId: validAccessoryId,
        createdVia: 'widget',
        ticketNumber: ticketNumber
      }
    });

    // Create initial message with ticket body or subject
    const initialMessage = ticketBody || subject;
    if (initialMessage) {
      const message = await prisma.message.create({
        data: {
          conversationId: ticket.ticketNumber,
          senderId: customer.id,
          senderType: 'customer',
          content: initialMessage,
          type: 'text'
        }
      });

      // Trigger webhook for message creation
      try {
        const { triggerWebhook } = await import('../../../../lib/utils/webhooks');
        await triggerWebhook('message.created', {
          message: {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            senderType: message.senderType,
            type: message.type,
            createdAt: message.createdAt
          },
          ticket: {
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority
          },
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email
          }
        });
      } catch (webhookError) {
        console.error('Error triggering message.created webhook:', webhookError);
        // Don't fail ticket creation if webhook fails
      }
    }

    // Fetch full ticket details for response
    const fullTicket = await prisma.conversation.findUnique({
      where: { ticketNumber: ticket.ticketNumber },
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        },
        accessory: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      ticket: {
        ticketNumber: fullTicket.ticketNumber,
        subject: fullTicket.subject,
        status: fullTicket.status,
        priority: fullTicket.priority,
        createdAt: fullTicket.createdAt,
        customerName: fullTicket.customerName,
        customerEmail: fullTicket.customerEmail,
        customerPhone: fullTicket.customerPhone,
        customerAltPhone: fullTicket.customerAltPhone,
        customerAddress: fullTicket.customerAddress,
        orderNumber: fullTicket.orderNumber,
        purchasedFrom: fullTicket.purchasedFrom,
        ticketBody: fullTicket.ticketBody,
        invoiceUrl: fullTicket.invoiceUrl,
        additionalDocuments: fullTicket.additionalDocuments ? JSON.parse(fullTicket.additionalDocuments) : [],
        issueVideoLink: fullTicket.issueVideoLink,
        issueType: fullTicket.issueType,
        product: fullTicket.product,
        accessory: fullTicket.accessory
      }
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating ticket',
      error: error.message
    });
  }
}

