// Função para configurar as abas do modal de metas
function setupGoalModalTabs() {
    const tabBtns = document.querySelectorAll('#goalModal .tab-btn');
    const tabPanes = document.querySelectorAll('#goalModal .tab-pane');

    console.log('Configurando abas do modal de metas...'); // Debug
    console.log('Botões encontrados:', tabBtns.length); // Debug
    console.log('Painéis encontrados:', tabPanes.length); // Debug

    // Remover listeners antigos para evitar duplicação
    tabBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });

    // Adicionar novos listeners
    document.querySelectorAll('#goalModal .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Tab clicked:', btn.dataset.target); // Debug
            
            // Remove active class from all buttons and panes
            document.querySelectorAll('#goalModal .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#goalModal .tab-pane').forEach(p => p.classList.remove('active'));

            // Add active class to clicked button and corresponding pane
            btn.classList.add('active');
            const targetPane = document.querySelector(btn.dataset.target);
            if (targetPane) {
                targetPane.classList.add('active');
                console.log('Activated pane:', btn.dataset.target); // Debug
            } else {
                console.log('Target pane not found:', btn.dataset.target); // Debug
            }
        });
    });

    // Activate first tab by default if none is active
    if (!document.querySelector('#goalModal .tab-btn.active') && tabBtns.length > 0) {
        console.log('Activating first tab by default'); // Debug
        tabBtns[0].click();
    }
}

// Adicionar listener para o tipo de notificação
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, setting up listeners'); // Debug
    
    const notificationTypeSelect = document.getElementById('notificationType');
    const postponeDaysGroup = document.getElementById('postponeDaysGroup');

    if (notificationTypeSelect && postponeDaysGroup) {
        notificationTypeSelect.addEventListener('change', (e) => {
            console.log('Notification type changed:', e.target.value); // Debug
            postponeDaysGroup.style.display = 
                e.target.value === 'postpone' ? 'block' : 'none';
        });
    }

    // Adicionar lógica para enviar notificações inteligentes
    if (notificationTypeSelect) {
        notificationTypeSelect.addEventListener('change', (e) => {
            const notificationType = e.target.value;
            if (notificationType === 'notify') {
                showNotification('info', 'Notificação', 'Você será notificado antes do prazo.');
            } else if (notificationType === 'postpone') {
                showNotification('warning', 'Adiar', 'A meta será adiada automaticamente se não for atingida.');
            } else if (notificationType === 'auto_adjust') {
                showNotification('success', 'Ajuste Automático', 'A meta será ajustada automaticamente para se adequar ao seu progresso.');
            }
        });
    }

    // Configurar as abas assim que o DOM carregar
    setupGoalModalTabs();
});

function toggleGoalModal(show = null) {
    const modal = document.getElementById('goalModal');
    if (!modal) return;

    if (show === null) {
        show = !modal.classList.contains('active');
    }

    if (show) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setupGoalModalTabs(); // Chamar novamente ao abrir o modal

        // Configurar estado inicial dos campos de notificação
        const notificationType = document.getElementById('notificationType');
        const postponeDaysGroup = document.getElementById('postponeDaysGroup');
        if (notificationType && postponeDaysGroup) {
            postponeDaysGroup.style.display = 
                notificationType.value === 'postpone' ? 'block' : 'none';
        }
    } else {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        // Limpa os campos do formulário
        const goalNameInput = document.getElementById('goalName');
        if (goalNameInput) {
            goalNameInput.value = '';
        }
        const targetAmountInput = document.getElementById('targetAmount');
        if (targetAmountInput) {
            targetAmountInput.value = '';
        }
        const deadlineInput = document.getElementById('deadline');
        if (deadlineInput) {
            deadlineInput.value = '';
        }
        const notificationDaysInput = document.getElementById('notificationDays');
        if (notificationDaysInput) {
            notificationDaysInput.value = '7';
        }
        const notificationTypeInput = document.getElementById('notificationType');
        if (notificationTypeInput) {
            notificationTypeInput.value = 'notify';
        }
        const postponeDaysInput = document.getElementById('postponeDays');
        if (postponeDaysInput) {
            postponeDaysInput.value = '30';
        }
    }
}

// Função para verificar metas e enviar notificações
function checkGoalsForNotifications() {
    console.log('Executando checkGoalsForNotifications'); // Log de depuração
    const today = new Date();
    
    if (!goals || goals.length === 0) {
        console.log('Nenhuma meta encontrada para verificar');
        return;
    }

    // Criar um Set para controlar metas já notificadas hoje
    const notifiedGoalsToday = new Set();

    goals.forEach(goal => {
        // Se a meta já foi notificada hoje, ignorar
        const goalKey = `${goal.id}_${today.toDateString()}`;
        if (notifiedGoalsToday.has(goalKey)) {
            return;
        }

        console.log('Verificando meta:', goal); // Log completo da meta
        const deadline = new Date(goal.deadline);
        const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

        console.log('Dias até o prazo:', daysUntilDeadline);
        console.log('Tipo de notificação:', goal.notification_type);

        let shouldNotify = false;

        // Notificar antes do prazo
        if (goal.notification_type === 'notify' && daysUntilDeadline <= goal.notification_days) {
            showNotification('warning', 'Lembrete de Meta', 
                `A meta "${goal.name}" vence em ${daysUntilDeadline} dias! 
                 Meta: ${formatCurrency(goal.target_amount)}`
            );
            shouldNotify = true;
        }

        // Solicitar confirmação para reajuste automático
        if (goal.notification_type === 'auto_adjust' && daysUntilDeadline <= 0) {
            showConfirmation(
                'Reajustar Meta', 
                `A meta "${goal.name}" venceu. Deseja reajustar automaticamente por mais ${goal.postpone_days} dias?`
            ).then(confirmed => {
                if (confirmed) {
                    const newDeadline = new Date(deadline);
                    newDeadline.setDate(newDeadline.getDate() + goal.postpone_days);
                    updateGoalDeadline(goal.id, newDeadline.toISOString().split('T')[0]);
                }
            });
            shouldNotify = true;
        }

        // Adiar automaticamente
        if (goal.notification_type === 'postpone' && daysUntilDeadline <= 0) {
            const newDeadline = new Date(deadline);
            newDeadline.setDate(newDeadline.getDate() + goal.postpone_days);
            updateGoalDeadline(goal.id, newDeadline.toISOString().split('T')[0]);
            showNotification('info', 'Meta Adiada', 
                `A meta "${goal.name}" foi adiada automaticamente por ${goal.postpone_days} dias.`
            );
            shouldNotify = true;
        }

        // Se houve notificação, adicionar ao Set
        if (shouldNotify) {
            notifiedGoalsToday.add(goalKey);
        }
    });
}

// Função para atualizar a data limite da meta
async function updateGoalDeadline(goalId, newDeadline) {
    try {
        const { error } = await supabase
            .from('financial_goals')
            .update({ deadline: newDeadline })
            .eq('id', goalId);

        if (error) throw error;

        // Recarregar as metas após a atualização
        await loadGoals();
        
        showNotification('success', 'Meta Atualizada', 'A data limite da meta foi atualizada com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar meta:', error);
        showNotification('error', 'Erro', 'Não foi possível atualizar a meta.');
    }
}

// Alterar o intervalo para verificar a cada hora em vez de diariamente
setInterval(checkGoalsForNotifications, 60 * 60 * 1000); // Verificar uma vez por hora

async function handleGoalSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = {
            name: document.getElementById('goalName').value,
            target_amount: parseFloat(document.getElementById('targetAmount').value),
            deadline: document.getElementById('deadline').value,
            user_id: currentUser.id,
            // Adicionar campos de notificação
            notification_type: document.getElementById('notificationType').value,
            notification_days: parseInt(document.getElementById('notificationDays').value),
            postpone_days: parseInt(document.getElementById('postponeDays')?.value || '30')
        };

        // Validações
        if (!formData.name || !formData.target_amount || !formData.deadline) {
            throw new Error('Por favor, preencha todos os campos obrigatórios.');
        }

        if (formData.target_amount <= 0) {
            throw new Error('O valor alvo deve ser maior que zero.');
        }

        const { data, error } = await supabase
            .from('financial_goals')
            .insert([formData])
            .select()
            .single();

        if (error) throw error;

        showNotification('success', 'Meta Criada', 'Meta criada com sucesso!');
        toggleGoalModal(false);
        await loadGoals();
    } catch (error) {
        console.error('Erro ao criar meta:', error);
        showNotification('error', 'Erro ao Criar Meta', error.message || 'Não foi possível criar a meta. Por favor, tente novamente.');
    }
}

function renderGoals() {
    const goalsContainer = document.querySelector('.goals-container');
    if (!goalsContainer) return;

    if (!goals || goals.length === 0) {
        goalsContainer.innerHTML = `
            <div class="empty-goals">
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <h3>Comece a Planejar Seus Objetivos</h3>
                    <p>Crie metas financeiras para realizar seus sonhos.<br>Acompanhe seu progresso e mantenha-se motivado!</p>
                    <div class="empty-state-suggestions">
                        <div class="suggestion-item" onclick="toggleGoalModal(true)">
                            <i class="fas fa-home"></i>
                            <span>Casa Própria</span>
                        </div>
                        <div class="suggestion-item" onclick="toggleGoalModal(true)">
                            <i class="fas fa-car"></i>
                            <span>Carro Novo</span>
                        </div>
                        <div class="suggestion-item" onclick="toggleGoalModal(true)">
                            <i class="fas fa-plane"></i>
                            <span>Viagem</span>
                        </div>
                        <div class="suggestion-item" onclick="toggleGoalModal(true)">
                            <i class="fas fa-graduation-cap"></i>
                            <span>Educação</span>
                        </div>
                    </div>
                    <button class="btn btn-primary create-goal-btn" onclick="toggleGoalModal(true)">
                        <i class="fas fa-plus"></i>
                        Criar Primeira Meta
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Só mostrar o menu de estatísticas quando houver metas
    goalsContainer.innerHTML = `
        <div class="goals-stats-header">
            <div class="stat-card">
                <i class="fas fa-bullseye"></i>
                <div class="stat-info">
                    <span>Total de Metas</span>
                    <strong>${goals.length}</strong>
                </div>
            </div>
            <div class="stat-card">
                <i class="fas fa-check-circle"></i>
                <div class="stat-info">
                    <span>Metas Concluídas</span>
                    <strong>${getCompletedGoalsCount()}</strong>
                </div>
            </div>
            <div class="stat-card">
                <i class="fas fa-chart-line"></i>
                <div class="stat-info">
                    <span>Progresso Geral</span>
                    <strong>${calculateTotalProgress().toFixed(1)}%</strong>
                </div>
            </div>
            <div class="stat-card">
                <i class="fas fa-piggy-bank"></i>
                <div class="stat-info">
                    <span>Total Acumulado</span>
                    <strong>${formatCurrency(calculateTotalAccumulated())}</strong>
                </div>
            </div>
        </div>
        <div class="goals-list" id="goalsList">
            ${renderGoalsList()}
        </div>
    `;
}

// Funções auxiliares para cálculos
function getCompletedGoalsCount() {
    if (!goals) return 0;
    return goals.filter(goal => {
        const contributions = goal.contributions || [];
        const totalContributed = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
        return totalContributed >= goal.target_amount;
    }).length;
}

function calculateTotalProgress() {
    if (!goals || goals.length === 0) return 0;
    return goals.reduce((sum, goal) => {
        const contributions = goal.contributions || [];
        const totalContributed = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
        return sum + (totalContributed / goal.target_amount) * 100;
    }, 0) / goals.length;
}

function calculateTotalAccumulated() {
    if (!goals) return 0;
    return goals.reduce((sum, goal) => {
        const contributions = goal.contributions || [];
        return sum + contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
    }, 0);
}

function renderGoalsList() {
    if (!goals || goals.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-bullseye"></i>
                <h3>Comece a Planejar Seus Objetivos</h3>
                <p>Crie metas financeiras para realizar seus sonhos.<br>Acompanhe seu progresso e mantenha-se motivado!</p>
                <div class="empty-state-suggestions">
                    <div class="suggestion-item" onclick="toggleGoalModal(true)">
                        <i class="fas fa-home"></i>
                        <span>Casa Própria</span>
                    </div>
                    <div class="suggestion-item" onclick="toggleGoalModal(true)">
                        <i class="fas fa-car"></i>
                        <span>Carro Novo</span>
                    </div>
                    <div class="suggestion-item" onclick="toggleGoalModal(true)">
                        <i class="fas fa-plane"></i>
                        <span>Viagem</span>
                    </div>
                    <div class="suggestion-item" onclick="toggleGoalModal(true)">
                        <i class="fas fa-graduation-cap"></i>
                        <span>Educação</span>
                    </div>
                </div>
                <button class="btn btn-primary create-goal-btn" onclick="toggleGoalModal(true)">
                    <i class="fas fa-plus"></i>
                    Criar Primeira Meta
                </button>
            </div>
        `;
    }

    return goals.map(goal => {
        const contributions = goal.contributions || [];
        const totalContributed = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
        const progress = (totalContributed / goal.target_amount) * 100;
        const deadline = new Date(goal.deadline);
        const today = new Date();
        const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntilDeadline < 0;
        const isCompleted = totalContributed >= goal.target_amount;

        return `
            <div class="goal-card ${isOverdue ? 'overdue' : ''} ${isCompleted ? 'completed' : ''}">
                <div class="goal-header">
                    <div class="goal-title-wrapper">
                        <h3>${goal.name}</h3>
                    </div>
                    <div class="goal-actions">
                        <button onclick="showContributionModal(${goal.id})" class="btn btn-primary btn-sm" title="Contribuir" ${isCompleted ? 'disabled' : ''}>
                            <i class="fas fa-circle-plus"></i>
                        </button>
                        <button onclick="showGoalDetails(${goal.id})" class="btn btn-secondary btn-sm" title="Histórico">
                            <i class="fas fa-clock-rotate-left"></i>
                        </button>
                        <button onclick="handleDeleteGoal(${goal.id})" class="btn btn-danger btn-sm" title="Excluir">
                            <i class="fas fa-circle-xmark"></i>
                        </button>
                    </div>
                </div>
                <div class="goal-info">
                    <div class="goal-amount">
                        <span>Meta: ${formatCurrency(goal.target_amount)}</span>
                        <span>Acumulado: ${formatCurrency(totalContributed)}</span>
                    </div>
                    <div class="goal-deadline ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-clock"></i>
                        <span>${isOverdue ? 'Vencida há' : 'Vence em'} ${Math.abs(daysUntilDeadline)} dias</span>
                    </div>
                    <div class="goal-progress-container">
                        <div class="goal-progress" style="width: ${progress}%"></div>
                        <span class="progress-text">${progress.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Chamar a função quando as metas são carregadas
async function loadGoals() {
    try {
        // Primeiro, carregar as metas
        const { data: goalsData, error: goalsError } = await supabase
            .from('financial_goals')
            .select('*')
            .eq('user_id', currentUser.id);

        if (goalsError) throw goalsError;

        // Depois, carregar as contribuições para cada meta
        const { data: contributionsData, error: contributionsError } = await supabase
            .from('goal_contributions')
            .select('*')
            .in('goal_id', goalsData.map(goal => goal.id));

        if (contributionsError) throw contributionsError;

        // Combinar os dados
        goals = goalsData.map(goal => ({
            ...goal,
            contributions: contributionsData.filter(contrib => contrib.goal_id === goal.id)
        }));
        
        renderGoals();
        checkGoalsForNotifications();
    } catch (error) {
        console.error('Erro ao carregar metas:', error);
        showNotification('error', 'Erro', 'Não foi possível carregar as metas.');
    }
}

// Adicionar ao início do arquivo, após as definições de funções
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        loadGoals();
    }
});

async function showGoalDetails(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    // Remover painel existente se houver
    const existingPanel = document.getElementById('goalDetailsPanel');
    if (existingPanel) {
        existingPanel.remove();
    }

    const contributions = goal.contributions || [];
    const totalContributed = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
    const progress = (totalContributed / goal.target_amount) * 100;
    const remainingAmount = goal.target_amount - totalContributed;

    // Calcular estatísticas
    const avgContribution = contributions.length > 0 
        ? contributions.reduce((sum, contrib) => sum + contrib.amount, 0) / contributions.length 
        : 0;
    
    const monthsToComplete = avgContribution > 0 
        ? Math.ceil(remainingAmount / avgContribution) 
        : 0;

    const lastContribution = contributions.length > 0 
        ? new Date(contributions[contributions.length - 1].date) 
        : null;

    const panel = document.createElement('div');
    panel.id = 'goalDetailsPanel';
    panel.className = 'goal-details-panel';
    panel.innerHTML = `
        <div class="panel-header">
            <h3>Detalhes da Meta</h3>
            <button class="close-panel" onclick="closeGoalDetails()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="panel-content">
            <div class="goal-title">
                <i class="fas fa-bullseye"></i>
                <h4>${goal.name}</h4>
            </div>
            <div class="goal-summary">
                <div class="summary-item">
                    <label>Meta</label>
                    <span class="amount">${formatCurrency(goal.target_amount)}</span>
                </div>
                <div class="summary-item">
                    <label>Acumulado</label>
                    <span class="amount">${formatCurrency(totalContributed)}</span>
                </div>
                <div class="summary-item">
                    <label>Restante</label>
                    <span class="amount">${formatCurrency(remainingAmount)}</span>
                </div>
                <div class="summary-item">
                    <label>Progresso</label>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${progress}%"></div>
                        <span class="progress-text">${progress.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
            <div class="goal-statistics">
                <h5>
                    <i class="fas fa-chart-line"></i>
                    Análise da Meta
                </h5>
                <div class="statistics-grid">
                    <div class="stat-item">
                        <label>Contribuição Média</label>
                        <span>${formatCurrency(avgContribution)}</span>
                    </div>
                    ${avgContribution > 0 ? `
                        <div class="stat-item">
                            <label>Tempo Estimado</label>
                            <span>${monthsToComplete} ${monthsToComplete === 1 ? 'mês' : 'meses'}</span>
                        </div>
                    ` : ''}
                    ${lastContribution ? `
                        <div class="stat-item">
                            <label>Última Contribuição</label>
                            <span>${lastContribution.toLocaleDateString()}</span>
                        </div>
                    ` : ''}
                    <div class="stat-item">
                        <label>Total de Contribuições</label>
                        <span>${contributions.length}</span>
                    </div>
                </div>
            </div>
            <div class="contributions-section">
                <h5>
                    <i class="fas fa-history"></i>
                    Histórico de Contribuições
                </h5>
                <div class="contributions-timeline">
                    ${contributions.length > 0 ? contributions.map(contrib => `
                        <div class="timeline-item">
                            <div class="timeline-date">
                                <i class="fas fa-circle"></i>
                                ${new Date(contrib.date).toLocaleDateString()}
                            </div>
                            <div class="timeline-content">
                                <span class="amount">+ ${formatCurrency(contrib.amount)}</span>
                                ${contrib.notes ? `<p class="notes">${contrib.notes}</p>` : ''}
                            </div>
                        </div>
                    `).join('') : '<p class="no-contributions">Nenhuma contribuição realizada ainda.</p>'}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(panel);
    setTimeout(() => panel.classList.add('active'), 10);
}

function closeGoalDetails() {
    const panel = document.getElementById('goalDetailsPanel');
    if (panel) {
        panel.classList.remove('active');
        setTimeout(() => panel.remove(), 300);
    }
}

async function handleContributionSubmit(e) {
    e.preventDefault();
    
    try {
        const goalId = document.getElementById('goalId').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const date = document.getElementById('date').value;
        const notes = document.getElementById('notes').value;

        // Encontrar a meta e calcular o valor restante
        const goal = goals.find(g => g.id === parseInt(goalId));
        if (!goal) throw new Error('Meta não encontrada');

        const totalContributed = goal.contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
        const remainingAmount = goal.target_amount - totalContributed;

        // Validar se o valor da contribuição não excede o valor restante
        if (amount > remainingAmount) {
            throw new Error(`O valor máximo permitido para contribuição é ${formatCurrency(remainingAmount)}`);
        }

        const { data, error } = await supabase
            .from('goal_contributions')
            .insert([{
                goal_id: goalId,
                user_id: currentUser.id,
                amount,
                date,
                notes
            }])
            .select()
            .single();

        if (error) throw error;

        showNotification('success', 'Contribuição Registrada', 'Sua contribuição foi registrada com sucesso!');
        toggleContributionModal(false);
        await loadGoals();

        // Se a meta foi completada com esta contribuição
        if (totalContributed + amount >= goal.target_amount) {
            showNotification('success', 'Meta Alcançada! 🎉', 'Parabéns! Você atingiu sua meta!');
        }
    } catch (error) {
        console.error('Erro ao registrar contribuição:', error);
        showNotification('error', 'Erro', error.message || 'Não foi possível registrar a contribuição.');
    }
} 