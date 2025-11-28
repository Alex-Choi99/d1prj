-- Add explanation columns to cards table
ALTER TABLE cards
ADD COLUMN explanation_text TEXT NULL,
ADD COLUMN explanation_difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
ADD COLUMN explanation_generated_at TIMESTAMP NULL;
