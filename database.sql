-- Create tables
CREATE TABLE IF NOT EXISTS transactions (
	id SERIAL PRIMARY KEY,
	description VARCHAR(255) NOT NULL,
	amount DECIMAL(10,2) NOT NULL,
	category VARCHAR(100) NOT NULL,
	date DATE NOT NULL,
	currency VARCHAR(3) DEFAULT 'BRL',
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
	id SERIAL PRIMARY KEY,
	currency VARCHAR(3) DEFAULT 'BRL',
	theme VARCHAR(10) DEFAULT 'light',
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	type VARCHAR(50) NOT NULL
);

-- Insert default categories
INSERT INTO categories (name, type) VALUES
	('Salário', 'income'),
	('Alimentação', 'expense'),
	('Transporte', 'expense'),
	('Moradia', 'expense'),
	('Lazer', 'expense'),
	('Saúde', 'expense'),
	('Educação', 'expense'),
	('Outros', 'expense');

-- Create test transaction
INSERT INTO transactions (description, amount, category, date) 
VALUES ('Teste inicial', 100.00, 'Outros', CURRENT_DATE);
