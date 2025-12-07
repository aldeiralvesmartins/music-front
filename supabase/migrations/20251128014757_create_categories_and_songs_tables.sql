/*
  # Create Music Categories and Songs Tables

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name like "Rock", "Pop", "Jazz"
      - `slug` (text, unique) - URL-friendly slug
      - `description` (text) - Category description
      - `created_at` (timestamptz) - Record creation timestamp

    - `songs`
      - `id` (uuid, primary key)
      - `title` (text) - Song title
      - `filename` (text) - Original filename
      - `file_path` (text) - Storage path
      - `size_mb` (numeric) - File size in MB
      - `duration` (text) - Song duration (e.g., "3:45")
      - `category_id` (uuid, foreign key) - Reference to categories
      - `created_at` (timestamptz) - Upload timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Public read access for all users
    - Only authenticated users can insert songs
    - Only song owners can update/delete their songs

  3. Sample Data
    - Insert popular music categories (Rock, Pop, Jazz, Electronic, Hip Hop, Classical)
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  size_mb numeric NOT NULL DEFAULT 0,
  duration text DEFAULT '0:00',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Songs policies
CREATE POLICY "Anyone can view songs"
  ON songs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert songs"
  ON songs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own songs"
  ON songs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own songs"
  ON songs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
  ('Rock', 'rock', 'Rock and alternative music'),
  ('Pop', 'pop', 'Popular and mainstream music'),
  ('Jazz', 'jazz', 'Jazz and blues music'),
  ('Electronic', 'electronic', 'Electronic and dance music'),
  ('Hip Hop', 'hip-hop', 'Hip hop and rap music'),
  ('Classical', 'classical', 'Classical and orchestral music'),
  ('Indie', 'indie', 'Independent and alternative music'),
  ('R&B', 'rnb', 'Rhythm and blues music')
ON CONFLICT (slug) DO NOTHING;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_songs_category_id ON songs(category_id);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at DESC);
