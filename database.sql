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

-- Tabela de Despesas Fixas
CREATE TABLE IF NOT EXISTS fixed_expenses (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	user_id UUID REFERENCES auth.users NOT NULL,
	description TEXT NOT NULL,
	amount DECIMAL NOT NULL,
	category TEXT NOT NULL,
	due_day INTEGER NOT NULL,
	notification_days INTEGER DEFAULT 3,
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
	
	CONSTRAINT positive_amount CHECK (amount > 0),
	CONSTRAINT valid_due_day CHECK (due_day BETWEEN 1 AND 31),
	CONSTRAINT valid_notification_days CHECK (notification_days >= 0)
);

-- Tabela de Pagamentos de Despesas Fixas
CREATE TABLE IF NOT EXISTS fixed_expense_payments (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	fixed_expense_id UUID REFERENCES fixed_expenses ON DELETE CASCADE NOT NULL,
	user_id UUID REFERENCES auth.users NOT NULL,
	amount DECIMAL NOT NULL,
	date DATE NOT NULL,
	payment_proof TEXT,
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
	
	CONSTRAINT positive_payment_amount CHECK (amount > 0)
);

-- Habilitar RLS
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expense_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para Despesas Fixas
CREATE POLICY "Visualizar próprias despesas fixas"
ON fixed_expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Inserir próprias despesas fixas"
ON fixed_expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Atualizar próprias despesas fixas"
ON fixed_expenses FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deletar próprias despesas fixas"
ON fixed_expenses FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para Pagamentos
CREATE POLICY "Visualizar próprios pagamentos"
ON fixed_expense_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Inserir próprios pagamentos"
ON fixed_expense_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Atualizar próprios pagamentos"
ON fixed_expense_payments FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deletar próprios pagamentos"
ON fixed_expense_payments FOR DELETE
USING (auth.uid() = user_id);

-- Função para atualizar o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
	new.updated_at = timezone('utc'::text, now());
	return new;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o updated_at
CREATE TRIGGER update_fixed_expenses_updated_at
BEFORE UPDATE ON fixed_expenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
