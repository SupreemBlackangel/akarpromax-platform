import { sql } from "drizzle-orm";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL || "";
  const client = postgres(url, { ssl: "require", prepare: false, max: 1 });
  
  try {
    // Create the service_providers table
    await client`CREATE TABLE IF NOT EXISTS service_providers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      user_id uuid,
      business_name text NOT NULL,
      bio text,
      category_id uuid,
      country text,
      governorate text,
      city text,
      latitude numeric(10, 8),
      longitude numeric(11, 8),
      radius integer DEFAULT 50,
      phone text,
      email text,
      website text,
      status text DEFAULT 'draft',
      rating numeric(3, 2) DEFAULT '0',
      rating_count integer DEFAULT 0,
      jobs_completed integer DEFAULT 0,
      response_rate numeric(5, 2) DEFAULT '0',
      is_verified boolean DEFAULT false,
      is_top_rated boolean DEFAULT false,
      working_hours jsonb,
      availability boolean DEFAULT true,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )`;
    console.log('service_providers table created successfully');
    
    // Create the service_categories table referenced by it
    await client`CREATE TABLE IF NOT EXISTS service_categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      name_ar text NOT NULL,
      name_en text,
      slug text NOT NULL,
      icon text,
      description text,
      parent_id uuid,
      order integer DEFAULT 0,
      is_active boolean DEFAULT true,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now(),
      CONSTRAINT service_categories_slug_unique UNIQUE("slug")
    )`;
    console.log('service_categories table created');
    
    await client.end();
  } catch (e: unknown) {
    console.error("Error:", e instanceof Error ? e.message : String(e));
  }
}
main();