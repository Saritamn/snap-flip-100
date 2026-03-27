-- Run this in the Supabase SQL Editor

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT,
  firstName TEXT,
  lastName TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  photo TEXT,
  subscriptionTier TEXT DEFAULT 'Free',
  lookupCount INTEGER DEFAULT 0,
  maxLookups INTEGER DEFAULT 10,
  resetToken TEXT,
  resetTokenExpires TIMESTAMPTZ,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  userId TEXT NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
  name TEXT,
  brand TEXT,
  type TEXT,
  condition TEXT,
  purchasePrice NUMERIC,
  averageResalePrice NUMERIC,
  estimatedProfit NUMERIC,
  sellThroughRate TEXT,
  marketplace TEXT,
  photo TEXT,
  description TEXT,
  status TEXT DEFAULT 'Draft',
  soldPrice NUMERIC,
  shippingCost NUMERIC,
  marketplaceFee NUMERIC,
  actualProfit NUMERIC,
  marketplaceSoldOn TEXT,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  userId TEXT NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
  date TEXT NOT NULL,
  startLocation TEXT,
  endLocation TEXT,
  miles NUMERIC NOT NULL,
  notes TEXT,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
-- For simplicity in this demo, we'll allow all access if the service role key is used,
-- but in a real app you'd want proper RLS policies.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (if needed, though service role usually bypasses RLS)
CREATE POLICY "Service role full access on profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Service role full access on items" ON items FOR ALL USING (true);
CREATE POLICY "Service role full access on trips" ON trips FOR ALL USING (true);
