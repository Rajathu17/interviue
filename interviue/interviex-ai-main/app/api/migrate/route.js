import { db } from "@/neon";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Starting migration...");
    
    // Add missing columns to the interview table
    await db.execute(sql`
      ALTER TABLE interview 
      ADD COLUMN IF NOT EXISTS role VARCHAR,
      ADD COLUMN IF NOT EXISTS level VARCHAR,
      ADD COLUMN IF NOT EXISTS techstack TEXT,
      ADD COLUMN IF NOT EXISTS type VARCHAR,
      ADD COLUMN IF NOT EXISTS "coverImage" VARCHAR;
    `);
    
    return NextResponse.json({ 
      success: true, 
      message: "Migration completed successfully" 
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 