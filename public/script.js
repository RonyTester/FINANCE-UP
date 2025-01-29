// Estado da Aplicação
let currentUser = null;
let transactions = [];
let userSettings = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
	await checkAuth();
	setupEventListeners();
	initializeCharts();
	await loadUserData();
});

// Autenticação
async function checkAuth() {
	const { data: { session }, error } = await supabase.auth.getSession();
	if (!session) {
		window.location.href = '/auth.html';
		return;
	}
	currentUser = session.user;
}

// Configuração de Event Listeners
function setupEventListeners() {
	// Navegação
	document.querySelectorAll('.nav-item').forEach(item => {
		item.addEventListener('click', handleNavigation);
	});

	// Logout
	document.getElementById('logoutBtn').addEventListener('click', handleLogout);

	// Modal de Transação
	document.getElementById('newTransactionBtn')?.addEventListener('click', () => toggleModal(true));
	document.querySelector('.close-modal')?.addEventListener('click', () => toggleModal(false));
	document.querySelector('.cancel-modal')?.addEventListener('click', () => toggleModal(false));

	// Formulários
	document.getElementById('transactionForm')?.addEventListener('submit', handleTransactionSubmit);
	document.getElementById('settingsForm')?.addEventListener('submit', handleSettingsSubmit);

	// Filtros
	document.getElementById('periodSelect')?.addEventListener('change', handlePeriodChange);
	document.getElementById('searchTransaction')?.addEventListener('input', handleTransactionSearch);
	document.getElementById('filterCategory')?.addEventListener('change', handleTransactionFilter);
	document.getElementById('filterType')?.addEventListener('change', handleTransactionFilter);

	// Tema
	document.getElementById('theme')?.addEventListener('change', handleThemeChange);
}

// Carregamento de Dados
async function loadUserData() {
	await Promise.all([
		loadTransactions(),
		loadUserSettings()
	]);
	updateUI();
}

async function loadTransactions() {
	const { data, error } = await supabase
		.from('transactions')
		.select('*')
		.eq('user_id', currentUser.id)
		.order('date', { ascending: false });

	if (error) {
		console.error('Erro ao carregar transações:', error);
		return;
	}

	transactions = data;
}

async function loadUserSettings() {
	const { data, error } = await supabase
		.from('user_settings')
		.select('*')
		.eq('user_id', currentUser.id)
		.single();

	if (error && error.code !== 'PGRST116') {
		console.error('Erro ao carregar configurações:', error);
		return;
	}

	userSettings = data || {
		currency: 'BRL',
		theme: 'light'
	};

	applyTheme(userSettings.theme);
}

// Manipuladores de Eventos
function handleNavigation(e) {
	e.preventDefault();
	const page = e.currentTarget.dataset.page;
	showPage(page);
	
	document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
	e.currentTarget.classList.add('active');
}

async function handleLogout() {
	try {
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
		window.location.href = '/auth.html';
	} catch (error) {
		console.error('Erro ao fazer logout:', error);
		alert('Erro ao fazer logout. Por favor, tente novamente.');
	}
}

async function handleTransactionSubmit(e) {
	e.preventDefault();
	
	const form = e.target;
	const type = form.type.value;
	let amount = parseFloat(form.amount.value);
	
	if (type === 'expense') {
		amount = -Math.abs(amount);
	}

	const transaction = {
		description: form.description.value,
		amount,
		type: type,
		category: form.category.value,
		date: form.date.value,
		user_id: currentUser.id
	};

	try {
		const { data, error } = await supabase
			.from('transactions')
			.insert([transaction])
			.select()
			.single();

		if (error) throw error;

		transactions.unshift(data);
		updateUI();
		toggleModal(false);
		form.reset();
	} catch (error) {
		console.error('Erro ao salvar transação:', error);
		alert('Erro ao salvar transação. Por favor, tente novamente.');
	}
}

async function handleSettingsSubmit(e) {
	e.preventDefault();
	
	const newSettings = {
		currency: e.target.currency.value,
		theme: e.target.theme.value,
		user_id: currentUser.id
	};

	try {
		const { error } = await supabase
			.from('user_settings')
			.upsert([newSettings]);

		if (error) throw error;

		userSettings = newSettings;
		applyTheme(newSettings.theme);
		alert('Configurações salvas com sucesso!');
	} catch (error) {
		console.error('Erro ao salvar configurações:', error);
		alert('Erro ao salvar configurações. Por favor, tente novamente.');
	}
}

// Funções de UI
function showPage(pageId) {
	document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
	document.getElementById(`${pageId}-page`).classList.add('active');
}

function toggleModal(show) {
	const modal = document.getElementById('transactionModal');
	if (show) {
		modal.classList.add('active');
		document.getElementById('date').valueAsDate = new Date();
	} else {
		modal.classList.remove('active');
		document.getElementById('transactionForm').reset();
	}
}

function updateUI() {
	updateDashboard();
	updateTransactionsList();
	updateCharts();
}

function updateDashboard() {
	const { income, expenses, balance, savingsRate } = calculateFinancialMetrics();
	
	document.getElementById('totalIncome').textContent = formatCurrency(income);
	document.getElementById('totalExpenses').textContent = formatCurrency(Math.abs(expenses));
	document.getElementById('balance').textContent = formatCurrency(balance);
	document.getElementById('savings').textContent = `${savingsRate.toFixed(1)}%`;
}

function updateTransactionsList() {
	const container = document.getElementById('transactionsList');
	container.innerHTML = '';

	transactions.forEach(transaction => {
		const div = document.createElement('div');
		div.className = 'transaction-item';
		
		const amountClass = transaction.amount >= 0 ? 'amount-positive' : 'amount-negative';
		
		div.innerHTML = `
			<div class="transaction-info">
				<strong>${transaction.description}</strong>
				<div>${transaction.category}</div>
				<small>${new Date(transaction.date).toLocaleDateString()}</small>
			</div>
			<div class="transaction-amount ${amountClass}">
				${formatCurrency(Math.abs(transaction.amount))}
				<i class="fas fa-trash delete-btn" data-id="${transaction.id}"></i>
			</div>
		`;
		
		const deleteBtn = div.querySelector('.delete-btn');
		deleteBtn.addEventListener('click', () => handleDeleteTransaction(transaction.id));
		
		container.appendChild(div);
	});
}

function updateCharts() {
	updateExpensesChart();
	updateCashFlowChart();
}

// Funções Auxiliares
function calculateFinancialMetrics(period = 'all') {
	let filteredTransactions = transactions;
	
	if (period !== 'all') {
		const today = new Date();
		const startDate = new Date();
		
		if (period === 'month') {
			startDate.setMonth(today.getMonth() - 1);
		} else if (period === 'year') {
			startDate.setFullYear(today.getFullYear() - 1);
		}
		
		filteredTransactions = transactions.filter(t => new Date(t.date) >= startDate);
	}
	
	const income = filteredTransactions
		.filter(t => t.amount > 0)
		.reduce((sum, t) => sum + t.amount, 0);
		
	const expenses = filteredTransactions
		.filter(t => t.amount < 0)
		.reduce((sum, t) => sum + t.amount, 0);
		
	const balance = income + expenses;
	const savingsRate = income > 0 ? ((income + expenses) / income) * 100 : 0;
	
	return { income, expenses, balance, savingsRate };
}

function formatCurrency(value) {
	const currency = userSettings?.currency || 'BRL';
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency
	}).format(value);
}

function applyTheme(theme) {
	document.body.setAttribute('data-theme', theme);
}

// Inicialização dos Gráficos
function initializeCharts() {
	// Expenses by Category Chart
	const expenseCtx = document.getElementById('expensesByCategory').getContext('2d');
	window.expensesChart = new Chart(expenseCtx, {
		type: 'doughnut',
		data: {
			labels: [],
			datasets: [{
				data: [],
				backgroundColor: [
					'#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
					'#9966FF', '#FF9F40', '#2ECC71', '#E74C3C'
				],
				borderWidth: 2,
				borderColor: '#ffffff'
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: 'right',
					labels: {
						padding: 20,
						font: {
							size: 12
						}
					}
				},
				title: {
					display: true,
					text: 'Distribuição de Despesas',
					font: {
						size: 16,
						weight: 'bold'
					},
					padding: 20
				}
			},
			animation: {
				animateScale: true,
				animateRotate: true
			}
		}
	});

	// Cash Flow Chart
	const cashFlowCtx = document.getElementById('cashFlow').getContext('2d');
	window.cashFlowChart = new Chart(cashFlowCtx, {
		type: 'bar',
		data: {
			labels: [],
			datasets: [
				{
					label: 'Receitas',
					backgroundColor: 'rgba(46, 204, 113, 0.7)',
					borderColor: '#2ecc71',
					borderWidth: 2,
					data: []
				},
				{
					label: 'Despesas',
					backgroundColor: 'rgba(231, 76, 60, 0.7)',
					borderColor: '#e74c3c',
					borderWidth: 2,
					data: []
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: 'top',
					labels: {
						font: {
							size: 12
						}
					}
				},
				title: {
					display: true,
					text: 'Fluxo de Caixa Mensal',
					font: {
						size: 16,
						weight: 'bold'
					},
					padding: 20
				}
			},
			scales: {
				x: {
					grid: {
						display: false
					}
				},
				y: {
					beginAtZero: true,
					grid: {
						color: 'rgba(0, 0, 0, 0.1)'
					}
				}
			},
			animation: {
				duration: 1000,
				easing: 'easeInOutQuart'
			},
			hover: {
				mode: 'index',
				intersect: false
			}
		}
	});
}

// Funções de Filtro e Busca
function handlePeriodChange(e) {
	updateUI();
}

function handleTransactionSearch(e) {
	const searchTerm = e.target.value.toLowerCase();
	const filteredTransactions = transactions.filter(t => 
		t.description.toLowerCase().includes(searchTerm) ||
		t.category.toLowerCase().includes(searchTerm)
	);
	updateTransactionsList(filteredTransactions);
}

function handleTransactionFilter() {
	const categoryFilter = document.getElementById('filterCategory').value;
	const typeFilter = document.getElementById('filterType').value;
	
	let filteredTransactions = transactions;
	
	if (categoryFilter) {
		filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter);
	}
	
	if (typeFilter) {
		filteredTransactions = filteredTransactions.filter(t => 
			typeFilter === 'income' ? t.amount > 0 : t.amount < 0
		);
	}
	
	updateTransactionsList(filteredTransactions);
}

// Manipulação de Transações
async function handleDeleteTransaction(id) {
	if (!confirm('Tem certeza que deseja excluir esta transação?')) {
		return;
	}

	try {
		const { error } = await supabase
			.from('transactions')
			.delete()
			.eq('id', id);

		if (error) throw error;

		transactions = transactions.filter(t => t.id !== id);
		updateUI();
	} catch (error) {
		console.error('Erro ao deletar transação:', error);
		alert('Erro ao deletar transação. Por favor, tente novamente.');
	}
}

// Funções dos Gráficos
function updateExpensesChart() {
	const categories = {};
	transactions
		.filter(t => t.amount < 0)
		.forEach(t => {
			categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
		});

	window.expensesChart.data.labels = Object.keys(categories);
	window.expensesChart.data.datasets[0].data = Object.values(categories);
	window.expensesChart.update();
}

function updateCashFlowChart() {
	const monthlyData = {};
	const last12Months = new Date();
	last12Months.setMonth(last12Months.getMonth() - 11);

	transactions.forEach(t => {
		const date = t.date.substring(0, 7); // YYYY-MM
		if (!monthlyData[date]) {
			monthlyData[date] = { income: 0, expenses: 0 };
		}
		if (t.amount >= 0) {
			monthlyData[date].income += t.amount;
		} else {
			monthlyData[date].expenses += Math.abs(t.amount);
		}
	});

	const labels = Object.keys(monthlyData).sort();
	const incomeData = labels.map(date => monthlyData[date].income);
	const expenseData = labels.map(date => monthlyData[date].expenses);

	window.cashFlowChart.data.labels = labels;
	window.cashFlowChart.data.datasets[0].data = incomeData;
	window.cashFlowChart.data.datasets[1].data = expenseData;
	window.cashFlowChart.update();
}

function handleThemeChange(e) {
	applyTheme(e.target.value);
}