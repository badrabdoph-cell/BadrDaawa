import { prisma } from "@/lib/db";

export interface HealthSnapshot {
  timestamp: string;
  database: { connected: boolean; latencyMs: number };
  storage: { available: boolean; filesCount: number };
  memory: { used: number; total: number; percentUsed: number };
  uptime: number;
}

export async function getRealtimeHealth(): Promise<HealthSnapshot> {
  const start = Date.now();
  let dbConnected = false;
  
  try {
    if (prisma) {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    }
  } catch {
    dbConnected = false;
  }
  
  const dbLatency = Date.now() - start;
  
  const memory = process.memoryUsage();
  
  return {
    timestamp: new Date().toISOString(),
    database: { connected: dbConnected, latencyMs: dbLatency },
    storage: { 
      available: true, 
      filesCount: 0
    },
    memory: {
      used: Math.round(memory.heapUsed / 1024 / 1024),
      total: Math.round(memory.heapTotal / 1024 / 1024),
      percentUsed: Math.round((memory.heapUsed / memory.heapTotal) * 100),
    },
    uptime: process.uptime(),
  };
}
