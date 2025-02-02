// Estado da Aplicação
let currentUser = null;
let transactions = [];
let userSettings = null;
let isFirstLogin = false;
let fixedExpenses = []; // Adicionado para despesas fixas

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
	await checkAuth();
	setupEventListeners();
	setupFilterListeners();
	initializeCharts();
	await loadUserData();
	updateUserInfo();
	
	// Verifica se é primeiro login ou se não tem nome de usuário
	if (!userSettings?.display_name) {
		showWelcomeModal();
	}
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

	// Adicionar listener para o botão de deletar conta
	document.getElementById('deleteAccountBtn')?.addEventListener('click', handleDeleteAccount);

	// Event listeners para Despesas Fixas
	document.getElementById('newFixedExpenseBtn')?.addEventListener('click', () => toggleFixedExpenseModal(true));
	document.getElementById('fixedExpenseForm')?.addEventListener('submit', saveFixedExpense);
	document.querySelectorAll('#fixedExpenseModal .close-modal, #fixedExpenseModal .cancel-modal').forEach(element => {
		element?.addEventListener('click', () => toggleFixedExpenseModal(false));
	});

	document.getElementById('fixedExpensePaymentForm')?.addEventListener('submit', handlePaymentSubmit);
	document.querySelectorAll('#fixedExpensePaymentModal .close-modal, #fixedExpensePaymentModal .cancel-modal').forEach(element => {
		element?.addEventListener('click', () => togglePaymentModal(false));
	});
}

// Carregamento de Dados
async function loadUserData() {
	try {
		await Promise.all([
			loadTransactions(),
			loadUserSettings(),
			loadFixedExpenses() // Adicionado carregamento de despesas fixas
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
			isFirstLogin = false;
		} else {
			isFirstLogin = true;
			// Se não existir configurações, criar uma nova
			const defaultSettings = {
				currency: 'BRL',
				theme: 'light',
				display_name: '', // Garantir que começa vazio
				user_id: currentUser.id
			};
			
			const { data: newSettings, error: insertError } = await supabase
				.from('user_settings')
				.insert([defaultSettings])
				.select();

			if (insertError) {
				console.error('Erro ao criar configurações:', insertError);
				return;
			}

			userSettings = newSettings[0];
		}

		// Aplica o tema salvo
		applyTheme(userSettings.theme);
		
		// Atualiza o formulário com as configurações atuais
		updateSettingsForm();
		
		// Atualiza as informações do usuário
		updateUserInfo();
	} catch (error) {
		console.error('Erro ao carregar configurações:', error);
	}
}

// Funções para Despesas Fixas
async function loadFixedExpenses() {
	try {
		const { data: expenses, error } = await supabase
			.from('fixed_expenses')
			.select(`
				id,
				description,
				amount,
				category,
				due_day,
				notification_days,
				notes,
				user_id,
				payments:fixed_expense_payments(*)
			`)
			.eq('user_id', currentUser.id)
			.order('due_day');

		if (error) throw error;

		fixedExpenses = expenses || [];
		console.log('Despesas fixas carregadas:', fixedExpenses); // Debug
		updateFixedExpensesList();
		updateFixedExpensesProgress();
		checkDueExpenses();
	} catch (error) {
		console.error('Erro ao carregar despesas fixas:', error);
		showNotification('error', 'Erro', 'Erro ao carregar despesas fixas');
	}
}

function updateFixedExpensesList() {
	const container = document.getElementById('fixedExpensesList');
	if (!container) return;

	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();

	// Adicionar cabeçalho com o mês atual
	const monthNames = [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
	];

	if (!fixedExpenses.length) {
		container.innerHTML = `
			<div class="no-transactions">
				<p>Nenhuma despesa fixa cadastrada.</p>
				<button class="btn btn-primary" onclick="toggleFixedExpenseModal(true)">
					<i class="fas fa-plus"></i>
					Adicionar Despesa Fixa
				</button>
			</div>
		`;
		return;
	}

	container.innerHTML = `
		<div class="month-header">
			<h3>Despesas Fixas - ${monthNames[currentMonth]} de ${currentYear}</h3>
			<small>As despesas são renovadas automaticamente todo mês</small>
		</div>
		${fixedExpenses.map(expense => {
			// Calcular total pago no mês atual
			const currentMonthPayments = expense.payments?.filter(payment => {
				const paymentDate = new Date(payment.date);
				return paymentDate.getMonth() === currentMonth && 
					   paymentDate.getFullYear() === currentYear;
			}) || [];

			const totalPaid = currentMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
			const isPaidFull = totalPaid >= Number(expense.amount);
			const isPaidPartial = totalPaid > 0 && totalPaid < Number(expense.amount);
			const remainingAmount = Number(expense.amount) - totalPaid;

			const dueDate = new Date(currentYear, currentMonth, expense.due_day);
			const isOverdue = !isPaidFull && dueDate < currentDate;
			const daysUntilDue = Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));
			
			let statusClass = isPaidFull ? 'paid' : (isPaidPartial ? 'partial' : (isOverdue ? 'overdue' : ''));
			let statusText = isPaidFull ? 'Pago' : 
							(isPaidPartial ? `Pago Parcialmente (${formatCurrency(totalPaid)})` : 
							(isOverdue ? 'Atrasado' : `Vence em ${daysUntilDue} dias`));

			return `
				<div class="fixed-expense-item ${statusClass}">
					<div class="expense-info">
						<strong>${expense.description}</strong>
						<div>${expense.category}</div>
						<small>Vence dia ${expense.due_day}</small>
						<div class="expense-status">${statusText}</div>
						${isPaidPartial ? `
							<div class="payment-progress">
								<div class="progress-bar">
									<div class="progress" style="width: ${(totalPaid / Number(expense.amount)) * 100}%"></div>
								</div>
								<small>Falta: ${formatCurrency(remainingAmount)}</small>
							</div>
						` : ''}
						${expense.notes ? `<div class="expense-notes">${expense.notes}</div>` : ''}
					</div>
					<div class="expense-amount">
						${formatCurrency(expense.amount)}
						<div class="expense-actions">
							${!isPaidFull ? `
								<button class="btn btn-sm btn-success pay-btn" onclick="showPaymentModal(${expense.id}, ${remainingAmount})">
									<i class="fas fa-${isPaidPartial ? 'plus' : 'check'}"></i>
								</button>
							` : `
								<button class="btn btn-sm btn-info" onclick="showPaymentHistory(${expense.id})">
									<i class="fas fa-history"></i>
								</button>
							`}
							<button class="btn btn-sm btn-danger delete-btn" onclick="deleteFixedExpense(${expense.id})">
								<i class="fas fa-trash"></i>
							</button>
						</div>
					</div>
				</div>
			`;
		}).join('')}
	`;
}

// Adicionar estilos para o cabeçalho do mês
const style = document.createElement('style');
style.textContent = `
	.month-header {
		padding: 1rem;
		background: var(--bg-secondary);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		text-align: center;
	}
	.month-header h3 {
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}
	.month-header small {
		color: var(--text-secondary);
		font-style: italic;
	}
`;
document.head.appendChild(style);

function checkDueExpenses() {
	const currentDate = new Date();
	const currentDay = currentDate.getDate();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();

	fixedExpenses.forEach(expense => {
		const isPaid = expense.payments?.some(payment => {
			const paymentDate = new Date(payment.date);
			return paymentDate.getMonth() === currentMonth && 
				   paymentDate.getFullYear() === currentYear;
		});

		if (!isPaid) {
			const dueDate = new Date(currentYear, currentMonth, expense.due_day);
			const daysUntilDue = Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));

			if (daysUntilDue <= expense.notification_days && daysUntilDue >= 0) {
				showNotification(
					'warning',
					'Despesa Próxima do Vencimento',
					`${expense.description} vence em ${daysUntilDue} dias. Valor: ${formatCurrency(expense.amount)}`
				);
			}
		}
	});
}

function toggleFixedExpenseModal(show) {
	const modal = document.getElementById('fixedExpenseModal');
	if (show) {
		modal.classList.add('active');
	} else {
		modal.classList.remove('active');
		document.getElementById('fixedExpenseForm').reset();
	}
}

async function saveFixedExpense(event) {
	event.preventDefault();
	
	try {
		const formData = {
			description: document.getElementById('fixedExpenseDescription').value,
			amount: parseFloat(document.getElementById('fixedExpenseAmount').value),
			category: document.getElementById('fixedExpenseCategory').value,
			due_day: parseInt(document.getElementById('fixedExpenseDueDay').value),
			notification_days: parseInt(document.getElementById('fixedExpenseNotificationDays').value),
			notes: document.getElementById('fixedExpenseNotes').value,
			user_id: currentUser.id
		};

		// Validações
		if (!formData.description || !formData.amount || !formData.category || !formData.due_day) {
			throw new Error('Todos os campos obrigatórios devem ser preenchidos');
		}

		if (isNaN(formData.amount) || formData.amount <= 0) {
			throw new Error('O valor deve ser um número positivo');
		}

		if (formData.due_day < 1 || formData.due_day > 31) {
			throw new Error('O dia de vencimento deve ser entre 1 e 31');
		}

		const { data, error } = await supabase
			.from('fixed_expenses')
			.insert([formData])
			.select()
			.single();

		if (error) throw error;

		fixedExpenses.push({ ...data, payments: [] });
		updateFixedExpensesList();
		updateFixedExpensesProgress();
		toggleFixedExpenseModal(false);
		document.getElementById('fixedExpenseForm').reset();
		
		showNotification('success', 'Sucesso', 'Despesa fixa cadastrada com sucesso!');
	} catch (error) {
		console.error('Erro ao salvar despesa fixa:', error);
		showNotification('error', 'Erro', error.message || 'Erro ao salvar despesa fixa');
	}
}

function showPaymentModal(expenseId, defaultAmount) {
	console.log('Tentando abrir modal para despesa:', expenseId); // Debug
	console.log('Lista de despesas:', fixedExpenses); // Debug
	
	const modal = document.getElementById('fixedExpensePaymentModal');
	// Converter expenseId para número se for string
	const expenseIdNumber = typeof expenseId === 'string' ? parseInt(expenseId) : expenseId;
	const expense = fixedExpenses.find(e => e.id === expenseIdNumber);
	
	if (!expense) {
		console.error('Despesa não encontrada:', expenseId);
		showNotification('error', 'Erro', 'Não foi possível encontrar a despesa selecionada.');
		return;
	}

	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();

	// Calcular total já pago no mês atual
	const currentMonthPayments = expense.payments?.filter(payment => {
		const paymentDate = new Date(payment.date);
		return paymentDate.getMonth() === currentMonth && 
			   paymentDate.getFullYear() === currentYear;
	}) || [];

	const totalPaid = currentMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
	const remainingAmount = Number(expense.amount) - totalPaid;

	document.getElementById('paymentFixedExpenseId').value = expenseIdNumber; // Garantir que é número
	const amountInput = document.getElementById('paymentAmount');
	amountInput.value = defaultAmount || remainingAmount;
	amountInput.max = remainingAmount;
	
	// Definir a data atual como padrão
	const today = new Date().toISOString().split('T')[0];
	document.getElementById('paymentDate').value = today;
	
	// Limpar campos opcionais
	document.getElementById('paymentProof').value = '';
	document.getElementById('paymentNotes').value = '';
	
	modal.classList.add('active');

	// Remover listener anterior se existir
	const oldListener = amountInput._validateListener;
	if (oldListener) {
		amountInput.removeEventListener('input', oldListener);
	}

	// Adicionar novo listener de validação
	const validateListener = function() {
		const value = Number(this.value);
		if (value > remainingAmount) {
			this.value = remainingAmount;
			showNotification('warning', 'Atenção', `O valor máximo permitido é ${formatCurrency(remainingAmount)}`);
		}
	};
	amountInput.addEventListener('input', validateListener);
	amountInput._validateListener = validateListener;
}

async function handlePaymentSubmit(event) {
	event.preventDefault();
	
	try {
		const expenseId = parseInt(document.getElementById('paymentFixedExpenseId').value);
		const expense = fixedExpenses.find(e => e.id === expenseId);

		if (!expense) {
			console.error('Despesa não encontrada. ID:', expenseId, 'Lista de despesas:', fixedExpenses);
			throw new Error('Despesa não encontrada');
		}

		const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
		const currentDate = new Date();
		const currentMonth = currentDate.getMonth();
		const currentYear = currentDate.getFullYear();

		// Calcular total já pago no mês atual
		const currentMonthPayments = expense.payments?.filter(payment => {
			const paymentDate = new Date(payment.date);
			return paymentDate.getMonth() === currentMonth && 
				   paymentDate.getFullYear() === currentYear;
		}) || [];

		const totalPaid = currentMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
		const remainingAmount = Number(expense.amount) - totalPaid;

		// Validar valor do pagamento
		if (paymentAmount > remainingAmount) {
			throw new Error(`O valor máximo permitido é ${formatCurrency(remainingAmount)}`);
		}

		const payment = {
			fixed_expense_id: expenseId,
			user_id: currentUser.id,
			amount: paymentAmount,
			date: document.getElementById('paymentDate').value,
			payment_proof: document.getElementById('paymentProof').value,
			notes: document.getElementById('paymentNotes').value
		};

		const { data, error } = await supabase
			.from('fixed_expense_payments')
			.insert([payment])
			.select()
			.single();

		if (error) throw error;

		// Atualizar o estado local
		const expenseIndex = fixedExpenses.findIndex(e => e.id === expenseId);
		if (expenseIndex !== -1) {
			if (!fixedExpenses[expenseIndex].payments) {
				fixedExpenses[expenseIndex].payments = [];
			}
			fixedExpenses[expenseIndex].payments.push(data);
		}

		// Atualizar a interface imediatamente
		updateFixedExpensesList();
		updateFixedExpensesProgress();
		togglePaymentModal(false);
		document.getElementById('fixedExpensePaymentForm').reset();
		
		const isPaidFull = totalPaid + paymentAmount >= Number(expense.amount);
		showNotification(
			'success', 
			'Sucesso', 
			isPaidFull ? 'Pagamento registrado com sucesso! Despesa totalmente paga.' :
						`Pagamento parcial registrado com sucesso! Falta ${formatCurrency(remainingAmount - paymentAmount)}`
		);
	} catch (error) {
		console.error('Erro ao registrar pagamento:', error);
		showNotification('error', 'Erro', error.message || 'Erro ao registrar pagamento');
	}
}

async function showPaymentHistory(expenseId) {
	const expense = fixedExpenses.find(e => e.id === expenseId);
	if (!expense) return;

	const payments = expense.payments || [];
	const paymentsList = payments
		.sort((a, b) => new Date(b.date) - new Date(a.date))
		.map(payment => `
			<div class="payment-history-item">
				<div class="payment-info">
					<strong>${formatDate(payment.date)}</strong>
					<div>${formatCurrency(payment.amount)}</div>
					${payment.notes ? `<small>${payment.notes}</small>` : ''}
				</div>
				${payment.payment_proof ? `
					<a href="${payment.payment_proof}" target="_blank" class="btn btn-sm btn-info">
						<i class="fas fa-receipt"></i>
					</a>
				` : ''}
			</div>
		`).join('');

	showNotification(
		'info',
		`Histórico de Pagamentos - ${expense.description}`,
		paymentsList || 'Nenhum pagamento registrado',
		10000
	);
}

function togglePaymentModal(show) {
	const modal = document.getElementById('fixedExpensePaymentModal');
	if (show) {
		modal.classList.add('active');
	} else {
		modal.classList.remove('active');
		document.getElementById('fixedExpensePaymentForm').reset();
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

// Função para mostrar notificações
function showNotification(type, title, message, duration = 5000) {
	const container = document.getElementById('notifications-container');
	const notification = document.createElement('div');
	notification.className = `notification ${type}`;
	
	let icon = '';
	switch(type) {
		case 'success':
			icon = 'check-circle';
			break;
		case 'error':
			icon = 'times-circle';
			break;
		case 'warning':
			icon = 'exclamation-circle';
			break;
	}
	
	notification.innerHTML = `
		<i class="fas fa-${icon}"></i>
		<div class="notification-content">
			<div class="notification-title">${title}</div>
			<div class="notification-message">${message}</div>
		</div>
		<div class="notification-close">
			<i class="fas fa-times"></i>
		</div>
	`;
	
	container.appendChild(notification);
	
	// Adicionar evento de clique para fechar
	notification.querySelector('.notification-close').addEventListener('click', () => {
		notification.style.animation = 'slideOut 0.3s ease forwards';
		setTimeout(() => {
			container.removeChild(notification);
		}, 300);
	});
	
	// Remover automaticamente após a duração especificada
	setTimeout(() => {
		if (notification.parentElement) {
			notification.style.animation = 'slideOut 0.3s ease forwards';
			setTimeout(() => {
				if (notification.parentElement) {
					container.removeChild(notification);
				}
			}, 300);
		}
	}, duration);
}

// Função para confirmar ação
function showConfirmation(title, message) {
	return new Promise((resolve) => {
		const container = document.getElementById('notifications-container');
		if (!container) {
			console.error('Container de notificações não encontrado');
			return resolve(false);
		}

		// Remove qualquer confirmação anterior que possa existir
		const existingConfirmation = container.querySelector('.notification.warning');
		if (existingConfirmation) {
			container.removeChild(existingConfirmation);
		}

		const notification = document.createElement('div');
		notification.className = 'notification warning';
		
		notification.innerHTML = `
			<i class="fas fa-question-circle"></i>
			<div class="notification-content">
				<div class="notification-title">${title}</div>
				<div class="notification-message">${message}</div>
				<div class="notification-actions">
					<button class="btn btn-sm btn-primary confirm-yes">Sim</button>
					<button class="btn btn-sm btn-secondary confirm-no">Não</button>
				</div>
			</div>
		`;
		
		container.appendChild(notification);

		const handleYes = () => {
			cleanup();
			resolve(true);
		};

		const handleNo = () => {
			cleanup();
			resolve(false);
		};

		const cleanup = () => {
			yesButton.removeEventListener('click', handleYes);
			noButton.removeEventListener('click', handleNo);
			if (notification.parentElement) {
				notification.style.animation = 'slideOut 0.3s ease forwards';
				setTimeout(() => {
					if (notification.parentElement) {
						container.removeChild(notification);
					}
				}, 300);
			}
		};
		
		const yesButton = notification.querySelector('.confirm-yes');
		const noButton = notification.querySelector('.confirm-no');
		
		yesButton.addEventListener('click', handleYes);
		noButton.addEventListener('click', handleNo);

		// Auto-close após 30 segundos
		setTimeout(() => {
			if (notification.parentElement) {
				handleNo();
			}
		}, 30000);
	});
}

async function handleTransactionSubmit(e) {
	e.preventDefault();
	
	const form = e.target;
	const type = form.type.value;
	let amount = parseFloat(form.amount.value);
	
	if (type === 'expense') {
		amount = -Math.abs(amount);
	}

	const [year, month, day] = form.date.value.split('-');
	const formattedDate = `${year}-${month}-${day}`;

	const transaction = {
		description: form.description.value,
		amount,
		type: type,
		category: form.category.value,
		date: formattedDate,
		user_id: currentUser.id
	};

	try {
		const { data, error } = await supabase
			.from('transactions')
			.insert([transaction])
			.select()
			.single();

		if (error) throw error;

		window.transactions = [data, ...window.transactions];
		
		updateUI();
		updateDashboardUI();
		updateTransactionsList(window.transactions);
		updateCharts();
		updateCards();
		
		toggleModal(false);
		form.reset();
		
		showNotification('success', 'Sucesso', 'Transação adicionada com sucesso');
	} catch (error) {
		console.error('Erro ao salvar transação:', error);
		showNotification('error', 'Erro', 'Erro ao salvar transação. Por favor, tente novamente.');
	}
}

async function handleSettingsSubmit(e) {
	e.preventDefault();
	
	const displayName = document.getElementById('displayName').value.trim();
	
	if (!displayName) {
		showNotification('error', 'Erro', 'O nome de usuário não pode estar vazio.');
		return;
	}

	const newSettings = {
		currency: e.target.currency.value,
		theme: e.target.theme.value,
		display_name: displayName,
		user_id: currentUser.id
	};

	try {
		const { data: updatedSettings, error } = await supabase
			.from('user_settings')
			.update(newSettings)
			.eq('user_id', currentUser.id)
			.select();

		if (error) throw error;

		userSettings = updatedSettings[0];
		applyTheme(newSettings.theme);
		updateSettingsForm();
		updateUserInfo();
		
		showNotification('success', 'Sucesso', 'Configurações salvas com sucesso');
	} catch (error) {
		console.error('Erro ao salvar configurações:', error);
		showNotification('error', 'Erro', 'Erro ao salvar configurações. Por favor, tente novamente.');
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
	if (!id || !currentUser) {
		console.error('ID da transação ou usuário não fornecido');
		return;
	}

	const confirmed = await showConfirmation(
		'Confirmar Exclusão',
		'Tem certeza que deseja excluir esta transação?'
	);

	if (!confirmed) return;

	try {
		const { error } = await supabase
			.from('transactions')
			.delete()
			.eq('id', id)
			.eq('user_id', currentUser.id);

		if (error) throw error;

		window.transactions = window.transactions.filter(t => t.id !== id);
		
		updateUI();
		updateDashboardUI();
		updateTransactionsList(window.transactions);
		updateCharts();
		updateCards();
		
		showNotification('success', 'Sucesso', 'Transação excluída com sucesso');
	} catch (error) {
		console.error('Erro ao deletar transação:', error);
		showNotification('error', 'Erro', 'Erro ao deletar transação. Por favor, tente novamente.');
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

	const [year, month, day] = form.querySelector('#editDate').value.split('-');
	const formattedDate = `${year}-${month}-${day}`;

	const transaction = {
		description: form.querySelector('#editDescription').value,
		amount,
		type,
		category: form.querySelector('#editCategory').value,
		date: formattedDate
	};

	try {
		const { data, error } = await supabase
			.from('transactions')
			.update(transaction)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;

		const index = window.transactions.findIndex(t => t.id === id);
		if (index !== -1) {
			window.transactions[index] = data;
		}

		await loadTransactions();

		updateUI();
		updateDashboardUI();
		updateTransactionsList(window.transactions);
		updateCharts();
		updateCards();
		
		toggleEditModal(false);
		showNotification('success', 'Sucesso', 'Transação atualizada com sucesso');
	} catch (error) {
		console.error('Erro ao editar transação:', error);
		showNotification('error', 'Erro', 'Erro ao editar transação. Por favor, tente novamente.');
	}
}

// Atualizar informações do usuário
function updateUserInfo() {
	const userDisplayName = document.getElementById('userDisplayName');
	const mobileUserName = document.getElementById('mobileUserName');
	const displayNameInput = document.getElementById('displayName');
	const accountEmail = document.getElementById('accountEmail');
	const accountCreated = document.getElementById('accountCreated');
	
	if (currentUser) {
		const displayName = userSettings?.display_name || '';
		
		// Atualiza o nome na sidebar
		if (userDisplayName) {
			userDisplayName.textContent = displayName;
		}
		
		// Atualiza o nome na versão mobile
		if (mobileUserName) {
			mobileUserName.textContent = displayName;
		}
		
		// Atualiza as informações na página de configurações
		if (displayNameInput) {
			displayNameInput.value = displayName;
		}
		if (accountEmail) {
			accountEmail.textContent = currentUser.email;
		}
		if (accountCreated) {
			const createdDate = new Date(currentUser.created_at);
			accountCreated.textContent = createdDate.toLocaleDateString('pt-BR', {
				day: '2-digit',
				month: 'long',
				year: 'numeric'
			});
		}
	}
}

// Função para deletar conta
async function handleDeleteAccount() {
	const confirmed = await showConfirmation(
		'Excluir Conta',
		'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todos os seus dados serão perdidos.'
	);

	if (!confirmed) return;

	try {
		// Primeiro, deletar todas as transações do usuário
		const { error: transError } = await supabase
			.from('transactions')
			.delete()
			.eq('user_id', currentUser.id);
		
		if (transError) throw transError;

		// Deletar as configurações do usuário
		const { error: settingsError } = await supabase
			.from('user_settings')
			.delete()
			.eq('user_id', currentUser.id);
		
		if (settingsError) throw settingsError;

		// Por fim, deletar o usuário
		const { error: userError } = await supabase.auth.admin.deleteUser(currentUser.id);
		
		if (userError) throw userError;

		// Fazer logout e redirecionar para a página de login
		await supabase.auth.signOut();
		window.location.href = '/auth.html';
	} catch (error) {
		console.error('Erro ao deletar conta:', error);
		showNotification('error', 'Erro', 'Não foi possível deletar sua conta. Por favor, tente novamente.');
	}
}

// Modal de Boas-vindas
function showWelcomeModal() {
	const modal = document.createElement('div');
	modal.className = 'modal active';
	modal.id = 'welcomeModal';
	
	modal.innerHTML = `
		<div class="modal-content">
			<div class="modal-header">
				<div class="welcome-icon">
					<i class="fas fa-wallet"></i>
				</div>
				<h3>Bem-vindo ao FinanceUP!</h3>
				<p class="welcome-subtitle">Seu assistente financeiro pessoal</p>
			</div>
			<div class="modal-body">
				<div class="welcome-message">
					<i class="fas fa-user-circle"></i>
					<p>Para começar a usar o app, por favor escolha um nome de usuário:</p>
				</div>
				<form id="welcomeForm">
					<div class="form-group">
						<div class="input-icon">
							<i class="fas fa-user"></i>
							<input type="text" id="welcomeDisplayName" class="edit-input" 
								maxlength="30" placeholder="Seu nome de usuário" required>
						</div>
					</div>
					<div class="form-actions">
						<button type="submit" class="btn btn-primary">
							<i class="fas fa-check-circle"></i>
							Começar
						</button>
					</div>
				</form>
			</div>
		</div>
	`;
	
	document.body.appendChild(modal);
	
	const form = document.getElementById('welcomeForm');
	form.addEventListener('submit', handleWelcomeSubmit);
}

async function handleWelcomeSubmit(e) {
	e.preventDefault();
	
	const displayName = document.getElementById('welcomeDisplayName').value.trim();
	
	if (!displayName) {
		showNotification('error', 'Erro', 'O nome de usuário não pode estar vazio.');
		return;
	}

	try {
		// Se não existir configurações, criar uma nova
		if (!userSettings) {
			const defaultSettings = {
				currency: 'BRL',
				theme: 'light',
				display_name: displayName,
				user_id: currentUser.id
			};
			
			const { data: newSettings, error: insertError } = await supabase
				.from('user_settings')
				.insert([defaultSettings])
				.select();

			if (insertError) throw insertError;
			userSettings = newSettings[0];
		} else {
			// Se já existir, apenas atualiza
			const { data: updatedSettings, error } = await supabase
				.from('user_settings')
				.update({ display_name: displayName })
				.eq('user_id', currentUser.id)
				.select();

			if (error) throw error;
			userSettings = updatedSettings[0];
		}

		// Atualiza a interface
		updateUserInfo();
		
		// Remove o modal de boas-vindas com animação
		const modal = document.getElementById('welcomeModal');
		modal.style.animation = 'fadeOut 0.3s ease forwards';
		setTimeout(() => {
			if (modal && modal.parentElement) {
				document.body.removeChild(modal);
			}
		}, 300);
		
		showNotification('success', 'Bem-vindo!', 'Nome de usuário definido com sucesso!');
	} catch (error) {
		console.error('Erro ao salvar nome de usuário:', error);
		showNotification('error', 'Erro', 'Não foi possível salvar o nome de usuário. Por favor, tente novamente.');
	}
}

function updateFixedExpensesProgress() {
	const progressBar = document.getElementById('fixedExpensesProgress');
	const paidCount = document.getElementById('paidExpensesCount');
	const totalCount = document.getElementById('totalExpensesCount');
	
	if (!progressBar || !paidCount || !totalCount) return;

	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();

	const total = fixedExpenses.length;
	const paid = fixedExpenses.filter(expense => 
		expense.payments?.some(payment => {
			const paymentDate = new Date(payment.date);
			return paymentDate.getMonth() === currentMonth && 
				   paymentDate.getFullYear() === currentYear;
		})
	).length;

	const percentage = total > 0 ? (paid / total) * 100 : 0;
	
	progressBar.style.width = `${percentage}%`;
	paidCount.textContent = paid;
	totalCount.textContent = total;
}

async function deleteFixedExpense(expenseId) {
	const confirmed = await showConfirmation(
		'Excluir Despesa Fixa',
		'Tem certeza que deseja excluir esta despesa fixa? Todos os pagamentos relacionados também serão excluídos.'
	);

	if (!confirmed) return;

	try {
		const { error } = await supabase
			.from('fixed_expenses')
			.delete()
			.eq('id', expenseId);

		if (error) throw error;

		// Atualiza o estado local
		fixedExpenses = fixedExpenses.filter(e => e.id !== expenseId);
		updateFixedExpensesList();
		updateFixedExpensesProgress();
		
		showNotification('success', 'Sucesso', 'Despesa fixa excluída com sucesso!');
	} catch (error) {
		console.error('Erro ao excluir despesa fixa:', error);
		showNotification('error', 'Erro', 'Erro ao excluir despesa fixa');
	}
}

function formatDate(dateString) {
	const date = new Date(dateString);
	return date.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
}