import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

// --- TRACKER ROUTES ---
app.get('/api/tracker', async (req, res) => {
  try {
    const records = await prisma.readingTracker.findMany({
      orderBy: { book: 'asc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tracker records' });
  }
});

app.post('/api/tracker', async (req, res) => {
  try {
    const { book, chapter, isRead } = req.body;
    
    // Check if record exists
    const existing = await prisma.readingTracker.findUnique({
      where: {
        book_chapter: { book, chapter }
      }
    });
    
    let record;
    if (existing) {
      record = await prisma.readingTracker.update({
        where: { id: existing.id },
        data: { isRead }
      });
    } else {
      record = await prisma.readingTracker.create({
        data: { book, chapter, isRead }
      });
    }
    
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tracker record' });
  }
});

// --- NOTES ROUTES ---
app.get('/api/notes', async (req, res) => {
  try {
    const { chapterId } = req.query;
    let whereClause = {};
    if (chapterId) {
      whereClause = { chapterId: String(chapterId) };
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { title, content, chapterId } = req.body;
    const note = await prisma.note.create({
      data: {
        title: title || 'Untitled Note',
        content: content || '',
        chapterId: chapterId || null,
      },
    });
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const { id } = req.params;

    const note = await prisma.note.update({
      where: { id: parseInt(id) },
      data: { title, content },
    });
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.note.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// --- CHATS ROUTES ---
app.get('/api/chats', async (req, res) => {
  try {
    const chats = await prisma.chat.findMany({
      include: {
        messages: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await prisma.chat.create({
      data: {
        title: title || 'New Chat',
      },
      include: {
        messages: true,
      }
    });
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

app.delete('/api/chats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete associated messages first
    await prisma.message.deleteMany({
      where: { chatId: parseInt(id) },
    });

    await prisma.chat.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// AI Chat endpoint
app.get('/api/chats/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await prisma.message.findMany({
      where: { chatId: parseInt(id) },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/chats/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const chatId = parseInt(id);
    const { content } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction = `You are an expert, scholarly, and supportive Bible Study Assistant. Your purpose is to provide contextual exegesis, historical background, and practical applications of biblical texts. You should answer theological questions thoughtfully, keeping your responses clean, concise, and formatted in markdown. Use clear paragraphs, bullet points, or bold text for readability. Do not sound robotic; maintain a helpful, pastoral, yet academic tone. If a user asks for verses, provide them accurately. If a user asks off-topic questions, kindly pivot back to biblical studies.`;
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      systemInstruction: systemInstruction 
    });

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        chatId,
        role: 'user',
        content
      }
    });

    // Fetch past messages for history (excluding the one just saved)
    const pastMessages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });

    const history = pastMessages
      .filter(m => m.id !== userMessage.id)
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    // Start chat session
    const chatSession = model.startChat({
      history: history,
    });

    // Send user message to AI
    const result = await chatSession.sendMessage(content);
    const aiResponseText = result.response.text();

    // Save AI message
    const aiMessage = await prisma.message.create({
      data: {
        content: aiResponseText,
        role: 'model', // Use 'model' to match what frontend expects and past enum usage
        chatId: chatId,
      },
    });

    res.status(201).json({ userMessage, aiMessage });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
