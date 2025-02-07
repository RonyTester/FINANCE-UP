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
    const now = new Date();
    const THREE_HOURS = 3 * 60 * 60 * 1000; // 3 horas em milissegundos
    
    goals.forEach((goal, index) => {
        const deadline = new Date(goal.deadline);
        const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        const lastNotificationKey = `lastNotification_${goal.id}`;
        const lastNotification = localStorage.getItem(lastNotificationKey);

        // Notificações que precisam aparecer imediatamente
        if (goal.notification_type === 'auto_adjust' && daysUntilDeadline <= 0) {
            setTimeout(() => {
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
            }, index * 500); // Delay de 0.5 segundos entre cada notificação
            return;
        }

        // Verificar cooldown apenas para notificações não críticas
        if (!lastNotification || (now - new Date(lastNotification)) > THREE_HOURS) {
            if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
                setTimeout(() => {
                    showNotification(
                        'warning',
                        'Lembrete de Meta',
                        `A meta "${goal.name}" vence em ${daysUntilDeadline} dias! Meta: ${formatCurrency(goal.target_amount)}`,
                        4000
                    );
                    localStorage.setItem(lastNotificationKey, now.toISOString());
                }, index * 500); // Delay de 0.5 segundos entre cada notificação
            }
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
        const isCompleted = progress >= 100;

        return `
            <div class="goal-card ${isOverdue ? 'overdue' : ''} ${isCompleted ? 'completed' : ''}">
                <div class="goal-header">
                    <div class="goal-title-wrapper">
                        <h3>${goal.name}</h3>
                    </div>
                    <div class="goal-actions">
                        <button onclick="showContributionModal(${goal.id})" 
                                class="btn btn-primary btn-sm" 
                                title="Contribuir"
                                ${isCompleted ? 'disabled' : ''}>
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

// Adicionar após a função loadGoals()
function updateOverallProgress() {
    const totalGoals = goals.length;
    if (totalGoals === 0) return;

    const completedGoals = goals.filter(goal => {
        const totalContributed = (goal.contributions || []).reduce((sum, contrib) => sum + contrib.amount, 0);
        return (totalContributed / goal.target_amount) * 100 >= 100;
    }).length;

    const progressPercentage = (completedGoals / totalGoals) * 100;

    // Atualizar a barra de progresso geral
    const progressHtml = `
        <div class="overall-progress">
            <div class="progress-info">
                <span>Progresso Geral das Metas</span>
                <span class="progress-percentage">${progressPercentage.toFixed(1)}%</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progressPercentage}%"></div>
            </div>
            <div class="progress-stats">
                <span>${completedGoals} de ${totalGoals} metas concluídas</span>
            </div>
        </div>
    `;

    // Inserir antes da lista de metas
    const container = document.querySelector('.goals-container');
    const existingProgress = container.querySelector('.overall-progress');
    const goalsList = container.querySelector('.goals-list');
    
    if (existingProgress) {
        existingProgress.outerHTML = progressHtml;
    } else if (goalsList) {
        goalsList.insertAdjacentHTML('beforebegin', progressHtml);
    }
}

// Modificar a função loadGoals para chamar updateOverallProgress
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
        updateOverallProgress();
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

function showGoalDetails(goalId) {
    // Fechar qualquer painel existente antes de abrir um novo
    const existingPanel = document.querySelector('.goal-details-panel.active');
    if (existingPanel) {
        existingPanel.classList.remove('active');
        setTimeout(() => existingPanel.remove(), 300);
    }

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const contributions = goal.contributions || [];
    const totalContributed = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
    const progress = (totalContributed / goal.target_amount) * 100;
    const isCompleted = progress >= 100;

    const panel = document.createElement('div');
    panel.id = 'goalDetailsPanel';
    panel.className = 'goal-details-panel';
    panel.innerHTML = `
        <div class="goal-details-header">
            <i class="fas fa-bullseye"></i>
            <h3>${goal.name}</h3>
            <button onclick="closeGoalDetails()" class="close-details">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="goal-details-content">
            <div class="goal-details-info">
                <div class="info-item">
                    <span>Meta</span>
                    <strong>${formatCurrency(goal.target_amount)}</strong>
                </div>
                <div class="info-item">
                    <span>Acumulado</span>
                    <strong>${formatCurrency(totalContributed)}</strong>
                </div>
                <div class="goal-details-progress ${isCompleted ? 'completed' : ''}">
                    <div class="goal-details-progress-info">
                        <span>Progresso</span>
                    </div>
                    <div class="goal-details-progress-bar-container">
                        <div class="goal-details-progress-bar" style="width: ${progress}%"></div>
                    </div>
                    <div class="goal-details-progress-percentage">
                        ${progress.toFixed(1)}%
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
                                <div class="timeline-header">
                                    <span class="amount">+ ${formatCurrency(contrib.amount)}</span>
                                    <div class="timeline-actions">
                                        <button onclick="editContribution(${contrib.id})" class="btn btn-sm btn-secondary" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="deleteContribution(${contrib.id}, ${goalId})" class="btn btn-sm btn-danger" title="Excluir">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
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

// Modificar a função updateContributionHistory para preservar os botões
async function updateContributionHistory(goalId) {
    try {
        // Busca as contribuições atualizadas
        const { data: contributionsData, error: contributionsError } = await supabase
            .from('goal_contributions')
            .select('*')
            .eq('goal_id', goalId)
            .order('date', { ascending: false });

        if (contributionsError) throw contributionsError;

        // Atualiza o histórico na timeline
        const timelineContainer = document.querySelector('.contributions-timeline');
        if (timelineContainer) {
            timelineContainer.innerHTML = contributionsData.length > 0 ? 
                contributionsData.map(contrib => `
                    <div class="timeline-item">
                        <div class="timeline-date">
                            <i class="fas fa-circle"></i>
                            ${new Date(contrib.date).toLocaleDateString()}
                        </div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <span class="amount">+ ${formatCurrency(contrib.amount)}</span>
                                <div class="timeline-actions">
                                    <button onclick="editContribution(${contrib.id})" class="btn btn-sm btn-secondary" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteContribution(${contrib.id}, ${goalId})" class="btn btn-sm btn-danger" title="Excluir">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            ${contrib.notes ? `<p class="notes">${contrib.notes}</p>` : ''}
                        </div>
                    </div>
                `).join('') : 
                '<p class="no-contributions">Nenhuma contribuição realizada ainda.</p>';
        }

        // Atualiza o progresso da meta
        await updateGoalProgress(goalId);
    } catch (error) {
        console.error('Erro ao atualizar histórico:', error);
        showNotification('error', 'Erro', 'Não foi possível atualizar o histórico de contribuições.');
    }
}

// Modificar a função handleContributionSubmit
async function handleContributionSubmit(e) {
    e.preventDefault();

    try {
        const amountInput = document.querySelector('#contributionModal #amount');
        const dateInput = document.querySelector('#contributionModal #date');
        const notesInput = document.querySelector('#contributionModal #notes');
        const goalId = parseInt(document.querySelector('#contributionModal #goalId').value);

        const formData = {
            goal_id: goalId,
            amount: Number(amountInput.value.trim().replace(',', '.')),
            date: dateInput.value,
            notes: notesInput.value,
            user_id: currentUser.id
        };

        const { data, error } = await supabase
            .from('goal_contributions')
            .insert(formData)
            .select()
            .single();

        if (error) throw error;

        // Fecha o modal e limpa o formulário primeiro
        document.getElementById('contributionModal').classList.remove('active');
        document.getElementById('contributionForm').reset();

        // Depois atualiza os dados
        await updateContributionHistory(goalId);
        await loadGoals(); // Atualiza a lista geral de metas uma única vez
        
        showNotification('success', 'Sucesso', 'Contribuição adicionada com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar contribuição:', error);
        showNotification('error', 'Erro', error.message || 'Erro ao adicionar contribuição. Por favor, tente novamente.');
    }
}

// Função para atualizar o progresso da meta
async function updateGoalProgress(goalId) {
    try {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;

        const { data: contributions, error } = await supabase
            .from('goal_contributions')
            .select('amount')
            .eq('goal_id', goalId);

        if (error) throw error;

        const totalContributed = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
        const progress = (totalContributed / goal.target_amount) * 100;

        // Atualiza a barra de progresso no painel de detalhes
        const progressBar = document.querySelector('.goal-details-progress-bar');
        const progressPercentage = document.querySelector('.goal-details-progress-percentage');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        if (progressPercentage) {
            progressPercentage.textContent = `${progress.toFixed(1)}%`;
        }

        // Atualiza o valor acumulado
        const accumulatedElement = document.querySelector('.goal-details-info .info-item:nth-child(2) strong');
        if (accumulatedElement) {
            accumulatedElement.textContent = formatCurrency(totalContributed);
        }
    } catch (error) {
        console.error('Erro ao atualizar progresso:', error);
    }
} 

// Função para excluir contribuição
async function deleteContribution(contributionId, goalId) {
    try {
        const confirmed = await showConfirmation(
            'Excluir Contribuição',
            'Tem certeza que deseja excluir esta contribuição? Esta ação não pode ser desfeita.'
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from('goal_contributions')
            .delete()
            .eq('id', contributionId);

        if (error) throw error;

        // Atualizar o histórico e o progresso
        await updateContributionHistory(goalId);
        await loadGoals();
        
        showNotification('success', 'Sucesso', 'Contribuição excluída com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir contribuição:', error);
        showNotification('error', 'Erro', 'Não foi possível excluir a contribuição.');
    }
}

// Função para abrir o modal de edição
async function editContribution(contributionId) {
    try {
        // Buscar os dados da contribuição
        const { data: contribution, error } = await supabase
            .from('goal_contributions')
            .select('*')
            .eq('id', contributionId)
            .single();

        if (error) throw error;

        // Preencher o modal de edição
        document.getElementById('editContributionId').value = contribution.id;
        document.getElementById('editContributionAmount').value = contribution.amount;
        document.getElementById('editContributionDate').value = contribution.date.split('T')[0];
        document.getElementById('editContributionNotes').value = contribution.notes || '';
        document.getElementById('editContributionGoalId').value = contribution.goal_id;

        // Armazenar o ID da meta para reabrir o painel depois
        sessionStorage.setItem('lastOpenGoalId', contribution.goal_id);

        // Fechar o painel de detalhes no mobile antes de abrir o modal
        if (window.innerWidth <= 768) {
            const panel = document.getElementById('goalDetailsPanel');
            if (panel) {
                panel.classList.remove('active');
                setTimeout(() => panel.remove(), 300);
            }
        }

        // Mostrar o modal
        toggleEditContributionModal(true);
    } catch (error) {
        console.error('Erro ao carregar contribuição:', error);
        showNotification('error', 'Erro', 'Não foi possível carregar os dados da contribuição.');
    }
}

// Função para salvar a edição
async function handleEditContributionSubmit(e) {
    e.preventDefault();

    try {
        const contributionId = document.getElementById('editContributionId').value;
        const goalId = document.getElementById('editContributionGoalId').value;
        
        const formData = {
            amount: Number(document.getElementById('editContributionAmount').value),
            date: document.getElementById('editContributionDate').value,
            notes: document.getElementById('editContributionNotes').value
        };

        const { error } = await supabase
            .from('goal_contributions')
            .update(formData)
            .eq('id', contributionId);

        if (error) throw error;

        // Fechar o modal
        toggleEditContributionModal(false);

        // Atualizar a interface
        await updateContributionHistory(goalId);
        await loadGoals();

        // Reabrir o painel de detalhes no mobile
        if (window.innerWidth <= 768) {
            const lastGoalId = sessionStorage.getItem('lastOpenGoalId');
            if (lastGoalId) {
                setTimeout(() => {
                    showGoalDetails(lastGoalId);
                    sessionStorage.removeItem('lastOpenGoalId');
                }, 300);
            }
        }

        showNotification('success', 'Sucesso', 'Contribuição atualizada com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar contribuição:', error);
        showNotification('error', 'Erro', 'Não foi possível atualizar a contribuição.');
    }
}

// Função para controlar a visibilidade do modal de edição
function toggleEditContributionModal(show) {
    const modal = document.getElementById('editContributionModal');
    if (!modal) return;

    if (show) {
        modal.classList.add('active');
    } else {
        modal.classList.remove('active');
        document.getElementById('editContributionForm').reset();
    }
} 