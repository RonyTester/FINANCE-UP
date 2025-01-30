// Estado da Aplicação
let currentUser = null;
let transactions = [];
let userSettings = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
	await checkAuth();
	setupEventListeners();
	setupFilterListeners();
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
	document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

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

	// Filtros de Data
	const periodSelect = document.getElementById('periodSelect');
	const startDate = document.getElementById('startDate');
	const endDate = document.getElementById('endDate');
	const customDateRange = document.getElementById('customDateRange');

	if (periodSelect) {
		periodSelect.addEventListener('change', (e) => {
			if (e.target.value === 'custom') {
				customDateRange.style.display = 'flex';
				// Inicializar com o mês atual
				const today = new Date();
				const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
				const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
				
				startDate.value = firstDay.toISOString().split('T')[0];
				endDate.value = lastDay.toISOString().split('T')[0];
			} else {
				customDateRange.style.display = 'none';
			}
			handlePeriodChange(e);
		});
	}

	if (startDate) startDate.addEventListener('change', handlePeriodChange);
	if (endDate) endDate.addEventListener('change', handlePeriodChange);

	// Event listeners para o modal de edição
	document.querySelector('#editTransactionModal .close-modal')?.addEventListener('click', () => toggleEditModal(false));
	document.querySelector('#editTransactionModal .cancel-modal')?.addEventListener('click', () => toggleEditModal(false));
	document.getElementById('editTransactionForm')?.addEventListener('submit', handleEditTransactionSubmit);
}

// Carregamento de Dados
async function loadUserData() {
	try {
		await Promise.all([
			loadTransactions(),
			loadUserSettings()
		]);
		updateUI();
	} catch (error) {
		console.error('Erro ao carregar dados:', error);
		alert('Erro ao carregar dados. Por favor, recarregue a página.');
	}
}

async function loadTransactions() {
	try {
		let { data: transactions, error } = await supabase
			.from('transactions')
			.select('*')
			.order('date', { ascending: false });

		if (error) throw error;

		// Atualiza o estado global
		window.transactions = transactions || [];
		
		// Carrega as categorias no filtro
		updateCategoryFilter();
		
		// Atualiza a lista de transações
		updateTransactionsList(transactions);
		
		// Atualiza os gráficos
		updateCharts();
	} catch (error) {
		console.error('Erro ao carregar transações:', error);
		alert('Erro ao carregar transações. Por favor, tente novamente.');
	}
}

async function loadUserSettings() {
	try {
		const { data, error } = await supabase
			.from('user_settings')
			.select('*')
			.eq('user_id', currentUser.id)
			.single();

		if (error && error.code !== 'PGRST116') {
			console.error('Erro ao carregar configurações:', error);
			return;
		}

		if (data) {
			userSettings = data;
		} else {
			// Se não existir configurações, criar uma nova
			const defaultSettings = {
				currency: 'BRL',
				theme: 'light',
				user_id: currentUser.id
			};
			
			const { data: newSettings, error: insertError } = await supabase
				.from('user_settings')
				.insert([defaultSettings])
				.select()
				.single();

			if (insertError) {
				console.error('Erro ao criar configurações:', insertError);
				return;
			}

			userSettings = newSettings;
		}

		// Aplica o tema salvo
		applyTheme(userSettings.theme);
		
		// Atualiza o formulário com as configurações atuais
		updateSettingsForm();
	} catch (error) {
		console.error('Erro ao carregar configurações:', error);
	}
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

		// Atualiza o array local de transações
		window.transactions = [data, ...window.transactions];
		
		// Atualiza a UI imediatamente
		updateUI();
		updateDashboardUI();
		updateTransactionsList(window.transactions);
		updateCharts();
		
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
		// Atualiza as configurações existentes
		const { error } = await supabase
			.from('user_settings')
			.update(newSettings)
			.eq('user_id', currentUser.id);

		if (error) throw error;

		// Atualiza as configurações locais
		userSettings = newSettings;
		
		// Aplica o novo tema
		applyTheme(newSettings.theme);
		
		// Atualiza o formulário
		updateSettingsForm();
		
		alert('Configurações salvas com sucesso!');
	} catch (error) {
		console.error('Erro ao salvar configurações:', error);
		alert('Erro ao salvar configurações. Por favor, tente novamente.');
	}
}

// Funções de UI
function showPage(pageId) {
	document.querySelectorAll('.page').forEach(page => {
		page.classList.remove('active');
		page.style.display = 'none';
	});
	const targetPage = document.getElementById(`${pageId}-page`);
	if (targetPage) {
		targetPage.classList.add('active');
		targetPage.style.display = 'block';
	}
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
	const activePage = document.querySelector('.page.active')?.id;
	
	if (activePage === 'dashboard-page') {
		updateDashboardUI();
	} else if (activePage === 'transactions-page') {
		updateTransactionsList(window.transactions);
	}
}

function updateDashboardUI() {
	updateCards();
	updateCharts();
}

function updateCards() {
	const periodFilter = document.getElementById('periodSelect')?.value || 'month';
	let filteredTransactions = filterTransactionsByPeriod(window.transactions || [], periodFilter);

	const totalIncome = filteredTransactions
		.filter(t => t.type === 'income')
		.reduce((sum, t) => sum + Number(t.amount), 0);

	const totalExpenses = Math.abs(filteredTransactions
		.filter(t => t.type === 'expense')
		.reduce((sum, t) => sum + Number(t.amount), 0));

	const balance = totalIncome - totalExpenses;
	const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;

	document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
	document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
	document.getElementById('balance').textContent = formatCurrency(balance);
	document.getElementById('savings').textContent = `${savingsRate.toFixed(1)}%`;
}

function filterTransactionsByPeriod(transactions, period) {
	if (!transactions) return [];
	
	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth();

	return transactions.filter(t => {
		const transactionDate = new Date(t.date);
		
		switch (period) {
			case 'month':
				const transactionMonth = transactionDate.getMonth();
				const transactionYear = transactionDate.getFullYear();
				return transactionMonth === currentMonth && transactionYear === currentYear;
			case 'year':
				return transactionDate.getFullYear() === currentYear;
			case 'custom':
				const startDate = new Date(document.getElementById('startDate').value);
				const endDate = new Date(document.getElementById('endDate').value);
				endDate.setHours(23, 59, 59); // Incluir o dia inteiro
				return transactionDate >= startDate && transactionDate <= endDate;
			default: // 'all'
				return true;
		}
	});
}

function updateTransactionsList(filteredTransactions = null) {
	const container = document.getElementById('transactionsList');
	if (!container) return;
	
	container.innerHTML = '';
	
	const transactionsToShow = filteredTransactions || window.transactions;

	if (!transactionsToShow.length) {
		container.innerHTML = `
			<div class="no-transactions">
				<p>Nenhuma transação encontrada.</p>
				<button class="btn btn-primary" onclick="toggleModal(true)">
					<i class="fas fa-plus"></i>
					Adicionar Transação
				</button>
			</div>
		`;
		return;
	}

	transactionsToShow.forEach(transaction => {
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
				<div class="transaction-actions">
					<i class="fas fa-edit edit-btn" title="Editar"></i>
					<i class="fas fa-trash delete-btn" title="Excluir"></i>
				</div>
			</div>
		`;
		
		const editBtn = div.querySelector('.edit-btn');
		const deleteBtn = div.querySelector('.delete-btn');
		
		editBtn.addEventListener('click', () => toggleEditModal(true, transaction));
		deleteBtn.addEventListener('click', () => handleDeleteTransaction(transaction.id));
		
		container.appendChild(div);
	});
}

function updateCharts() {
	const periodFilter = document.getElementById('periodSelect')?.value || 'month';
	const filteredTransactions = filterTransactionsByPeriod(window.transactions || [], periodFilter);
	
	updateExpensesChart(filteredTransactions);
	updateCashFlowChart(filteredTransactions);
}

function updateExpensesChart(transactions) {
	const ctx = document.getElementById('expensesByCategory')?.getContext('2d');
	if (!ctx) return;

	// Destruir o gráfico existente se houver
	if (window.expensesChart) {
		window.expensesChart.destroy();
	}

	// Criar um novo gráfico
	window.expensesChart = new Chart(ctx, {
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
						color: 'rgb(255, 255, 255)',
						padding: 20,
						font: { size: 12 }
					}
				},
				title: {
					display: true,
					text: 'Distribuição de Despesas',
					color: 'rgb(255, 255, 255)',
					font: {
						size: 16,
						weight: 'bold'
					},
					padding: 20
				}
			}
		}
	});

	const categories = {};
	transactions
		.filter(t => t.type === 'expense')
		.forEach(t => {
			if (!categories[t.category]) {
				categories[t.category] = 0;
			}
			categories[t.category] += Math.abs(Number(t.amount));
		});

	const labels = Object.keys(categories);
	const data = Object.values(categories);

	window.expensesChart.data.labels = labels;
	window.expensesChart.data.datasets[0].data = data;
	window.expensesChart.update('none'); // Atualiza sem animação para melhor performance
}

function updateCashFlowChart(transactions) {
	if (!window.cashFlowChart) return;

	const periodSelect = document.getElementById('periodSelect');
	const period = periodSelect?.value || 'month';
	
	let labels = [];
	let monthlyData = {};

	if (period === 'custom') {
		// Para período personalizado, mostrar dias
		const startDate = new Date(document.getElementById('startDate').value);
		const endDate = new Date(document.getElementById('endDate').value);
		
		for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
			const dateKey = d.toISOString().split('T')[0];
			monthlyData[dateKey] = { income: 0, expenses: 0 };
		}

		// Agrupar transações por dia
		transactions.forEach(t => {
			const date = t.date.split('T')[0];
			if (monthlyData[date]) {
				if (t.type === 'income') {
					monthlyData[date].income += Number(t.amount);
				} else {
					monthlyData[date].expenses += Math.abs(Number(t.amount));
				}
			}
		});

		labels = Object.keys(monthlyData).map(date => {
			const [year, month, day] = date.split('-');
			return `${day}/${month}`;
		});
	} else {
		// Para outros períodos, manter a lógica mensal
		for (let i = 11; i >= 0; i--) {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			const monthKey = date.toISOString().substring(0, 7);
			monthlyData[monthKey] = { income: 0, expenses: 0 };
		}

		transactions.forEach(t => {
			const date = t.date.substring(0, 7);
			if (monthlyData[date]) {
				if (t.type === 'income') {
					monthlyData[date].income += Number(t.amount);
				} else {
					monthlyData[date].expenses += Math.abs(Number(t.amount));
				}
			}
		});

		labels = Object.keys(monthlyData).map(date => {
			const [year, month] = date.split('-');
			return `${month}/${year}`;
		});
	}

	const incomeData = Object.values(monthlyData).map(d => d.income);
	const expenseData = Object.values(monthlyData).map(d => d.expenses);

	window.cashFlowChart.data.labels = labels;
	window.cashFlowChart.data.datasets[0].data = incomeData;
	window.cashFlowChart.data.datasets[1].data = expenseData;
	window.cashFlowChart.update();
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
	document.body.setAttribute('data-theme', theme || 'light');
	
	// Atualiza o select do tema se existir
	const themeSelect = document.getElementById('theme');
	if (themeSelect) {
		themeSelect.value = theme || 'light';
	}
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
	const period = e.target.value;
	updateDashboardUI();
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
	const searchTerm = document.getElementById('searchTransaction').value.toLowerCase();
	
	let filteredTransactions = transactions;
	
	// Aplicar filtro de categoria
	if (categoryFilter) {
		filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter);
	}
	
	// Aplicar filtro de tipo
	if (typeFilter) {
		filteredTransactions = filteredTransactions.filter(t => 
			typeFilter === 'income' ? t.amount > 0 : t.amount < 0
		);
	}
	
	// Aplicar filtro de busca
	if (searchTerm) {
		filteredTransactions = filteredTransactions.filter(t => 
			t.description.toLowerCase().includes(searchTerm) ||
			t.category.toLowerCase().includes(searchTerm)
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

		// Atualiza o array local de transações
		window.transactions = window.transactions.filter(t => t.id !== id);
		
		// Atualiza a UI imediatamente
		updateUI();
		updateDashboardUI();
		updateTransactionsList(window.transactions);
		updateCharts();
		
	} catch (error) {
		console.error('Erro ao deletar transação:', error);
		alert('Erro ao deletar transação. Por favor, tente novamente.');
	}
}

// Funções dos Gráficos
function handleThemeChange(e) {
	applyTheme(e.target.value);
}

// Função para atualizar o formulário de configurações
function updateSettingsForm() {
	if (userSettings) {
		const currencySelect = document.getElementById('currency');
		const themeSelect = document.getElementById('theme');
		
		if (currencySelect) currencySelect.value = userSettings.currency;
		if (themeSelect) themeSelect.value = userSettings.theme;
	}
}

// Adicionar função para atualizar opções de categoria
function updateCategoryFilter() {
	const filterCategory = document.getElementById('filterCategory');
	if (!filterCategory) return;

	// Obtém categorias únicas das transações
	const categories = [...new Set(window.transactions.map(t => t.category))];
	
	// Limpa opções existentes
	filterCategory.innerHTML = '<option value="">Todas as Categorias</option>';
	
	// Adiciona novas opções
	categories.forEach(category => {
		if (category) {
			const option = document.createElement('option');
			option.value = category;
			option.textContent = category;
			filterCategory.appendChild(option);
		}
	});
}

// Função para filtrar transações
function filterTransactions() {
	const searchTerm = document.getElementById('searchTransaction')?.value.toLowerCase() || '';
	const categoryFilter = document.getElementById('filterCategory')?.value || '';
	const typeFilter = document.getElementById('filterType')?.value || '';
	const periodFilter = document.getElementById('periodSelect')?.value || 'month';

	let filteredTransactions = window.transactions;

	// Filtro por texto
	if (searchTerm) {
		filteredTransactions = filteredTransactions.filter(t => 
			t.description.toLowerCase().includes(searchTerm)
		);
	}

	// Filtro por categoria
	if (categoryFilter) {
		filteredTransactions = filteredTransactions.filter(t => 
			t.category === categoryFilter
		);
	}

	// Filtro por tipo
	if (typeFilter) {
		filteredTransactions = filteredTransactions.filter(t => 
			t.type === typeFilter
		);
	}

	// Filtro por período
	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth();

	switch (periodFilter) {
		case 'month':
			filteredTransactions = filteredTransactions.filter(t => {
				const transactionDate = new Date(t.date);
				const transactionMonth = transactionDate.getMonth();
				const transactionYear = transactionDate.getFullYear();
				return transactionMonth === currentMonth && transactionYear === currentYear;
			});
			break;
		case 'year':
			filteredTransactions = filteredTransactions.filter(t => {
				const transactionDate = new Date(t.date);
				return transactionDate.getFullYear() === currentYear;
			});
			break;
		// 'all' não precisa de filtro adicional
	}

	updateTransactionsList(filteredTransactions);
	updateCharts(filteredTransactions);
}

// Event Listeners para filtros
function setupFilterListeners() {
	const searchInput = document.getElementById('searchTransaction');
	const categoryFilter = document.getElementById('filterCategory');
	const typeFilter = document.getElementById('filterType');
	const periodFilter = document.getElementById('periodSelect');

	if (searchInput) searchInput.addEventListener('input', filterTransactions);
	if (categoryFilter) categoryFilter.addEventListener('change', filterTransactions);
	if (typeFilter) typeFilter.addEventListener('change', filterTransactions);
	if (periodFilter) periodFilter.addEventListener('change', filterTransactions);
}

// Funções de Edição de Transação
function toggleEditModal(show, transaction = null) {
	const modal = document.getElementById('editTransactionModal');
	if (show && transaction) {
		modal.classList.add('active');
		fillEditForm(transaction);
			} else {
		modal.classList.remove('active');
		document.getElementById('editTransactionForm').reset();
	}
}

function fillEditForm(transaction) {
	document.getElementById('editTransactionId').value = transaction.id;
	document.getElementById('editDescription').value = transaction.description;
	document.getElementById('editAmount').value = Math.abs(transaction.amount);
	document.getElementById('editType').value = transaction.type;
	document.getElementById('editCategory').value = transaction.category;
	document.getElementById('editDate').value = transaction.date.split('T')[0];
}

async function handleEditTransactionSubmit(e) {
	e.preventDefault();
	
	const form = e.target;
	const id = form.querySelector('#editTransactionId').value;
	const type = form.querySelector('#editType').value;
	let amount = parseFloat(form.querySelector('#editAmount').value);
	
	if (type === 'expense') {
		amount = -Math.abs(amount);
	}

	const transaction = {
		description: form.querySelector('#editDescription').value,
		amount,
		type,
		category: form.querySelector('#editCategory').value,
		date: form.querySelector('#editDate').value
	};

	try {
		const { data, error } = await supabase
			.from('transactions')
			.update(transaction)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;

		// Atualiza a transação no array local
		const index = window.transactions.findIndex(t => t.id === id);
		if (index !== -1) {
			window.transactions[index] = data;
		}

		// Recarrega os dados para garantir sincronização
		await loadTransactions();

		// Atualiza toda a UI
		const currentPage = document.querySelector('.page.active')?.id;
		if (currentPage === 'dashboard-page') {
			updateDashboardUI();
		} else if (currentPage === 'transactions-page') {
			updateTransactionsList(window.transactions);
		}

		// Atualiza gráficos e filtros
		updateCharts();
		updateCategoryFilter();
		
		// Fecha o modal e mostra mensagem de sucesso
		toggleEditModal(false);
		alert('Transação atualizada com sucesso!');
	} catch (error) {
		console.error('Erro ao editar transação:', error);
		alert('Erro ao editar transação. Por favor, tente novamente.');
	}
}