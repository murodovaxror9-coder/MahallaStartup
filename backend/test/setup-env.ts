// Testlar hermetik: .env o'qilmaydi, tashqi servislar kerak emas (xotiradagi PGlite + MemoryKv + vaqtinchalik papka).
process.env['NODE_ENV'] = 'test';
