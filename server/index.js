import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import * as db from './models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
	const token = req.headers.authorization?.split(' ')[1];
	
	if (!token) {
		return res.status(401).json({ error: 'Token não fornecido' });
	}

	try {
		const { data: { user }, error } = await supabase.auth.getUser(token);
		
		if (error) throw error;
		
		req.user = user;
		next();
	} catch (err) {
		console.error('Erro de autenticação:', err);
		res.status(401).json({ error: 'Token inválido' });
	}
};

// Rotas de Autenticação
app.post('/api/auth/signup', async (req, res) => {
	try {
		const { email, password } = req.body;
		const { data, error } = await supabase.auth.signUp({
			email,
			password
		});

		if (error) throw error;
		res.json(data);
	} catch (err) {
		console.error('Erro no signup:', err);
		res.status(400).json({ error: err.message });
	}
});

app.post('/api/auth/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) throw error;
		res.json(data);
	} catch (err) {
		console.error('Erro no login:', err);
		res.status(400).json({ error: err.message });
	}
});

// Rotas protegidas
app.get('/api/transactions', authMiddleware, async (req, res) => {
	try {
		const transactions = await db.getTransactions(req.user.id);
		res.json(transactions);
	} catch (err) {
		console.error('Erro ao buscar transações:', err);
		res.status(500).json({ 
			error: 'Erro ao carregar transações',
			details: err.message 
		});
	}
});

app.post('/api/transactions', authMiddleware, async (req, res) => {
	try {
		const { description, amount, category, date } = req.body;
		
		if (!description || !amount || !category || !date) {
			return res.status(400).json({
				error: 'Dados inválidos',
				details: 'Todos os campos são obrigatórios'
			});
		}

		if (isNaN(amount)) {
			return res.status(400).json({
				error: 'Valor inválido',
				details: 'O valor deve ser um número'
			});
		}

		if (!Date.parse(date)) {
			return res.status(400).json({
				error: 'Data inválida',
				details: 'Formato de data inválido'
			});
		}

		const transaction = await db.addTransaction({
			description,
			amount,
			category,
			date
		}, req.user.id);

		res.status(201).json(transaction);
	} catch (err) {
		console.error('Erro ao criar transação:', err);
		res.status(500).json({ 
			error: 'Erro ao salvar transação',
			details: err.message 
		});
	}
});

app.put('/api/transactions/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const transaction = await db.updateTransaction(id, req.body, req.user.id);
		res.json(transaction);
	} catch (err) {
		console.error('Erro ao atualizar transação:', err);
		res.status(500).json({ error: err.message });
	}
});

app.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		await db.deleteTransaction(id, req.user.id);
		res.json({ message: 'Transação deletada com sucesso' });
	} catch (err) {
		console.error('Erro ao deletar transação:', err);
		res.status(500).json({ error: err.message });
	}
});

// Rotas de Configurações
app.get('/api/settings', authMiddleware, async (req, res) => {
	try {
		const settings = await db.getUserSettings(req.user.id);
		res.json(settings);
	} catch (err) {
		console.error('Erro ao buscar configurações:', err);
		res.status(500).json({ error: err.message });
	}
});

app.put('/api/settings', authMiddleware, async (req, res) => {
	try {
		const settings = await db.updateUserSettings(req.body, req.user.id);
		res.json(settings);
	} catch (err) {
		console.error('Erro ao atualizar configurações:', err);
		res.status(500).json({ error: err.message });
	}
});

// Rotas de Categorias
app.get('/api/categories', authMiddleware, async (req, res) => {
	try {
		const categories = await db.getCategories(req.user.id);
		res.json(categories);
	} catch (err) {
		console.error('Erro ao buscar categorias:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/categories', authMiddleware, async (req, res) => {
	try {
		const category = await db.addCategory(req.body, req.user.id);
		res.json(category);
	} catch (err) {
		console.error('Erro ao criar categoria:', err);
		res.status(500).json({ error: err.message });
	}
});

app.put('/api/categories/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const category = await db.updateCategory(id, req.body, req.user.id);
		res.json(category);
	} catch (err) {
		console.error('Erro ao atualizar categoria:', err);
		res.status(500).json({ error: err.message });
	}
});

app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		await db.deleteCategory(id, req.user.id);
		res.json({ message: 'Categoria deletada com sucesso' });
	} catch (err) {
		console.error('Erro ao deletar categoria:', err);
		res.status(500).json({ error: err.message });
	}
});

// Serve the main page and handle client-side routing
app.get('/*', (req, res) => {
	res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Servidor rodando na porta ${PORT}`);
});
