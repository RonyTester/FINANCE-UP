// Função para gerenciar modais em dispositivos móveis
class MobileModalManager {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        // Adiciona listeners para todos os botões que abrem modais
        document.querySelectorAll('[data-open-modal]').forEach(button => {
            button.addEventListener('click', (e) => {
                const modalId = button.getAttribute('data-open-modal');
                this.openModal(modalId);
            });
        });

        // Adiciona listeners para fechar modais
        document.querySelectorAll('.modal .close-modal, .modal .cancel-modal').forEach(button => {
            button.addEventListener('click', () => this.closeModal());
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        this.activeModal = modal;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Ajusta a posição do modal
        this.adjustModalPosition(modal);

        // Adiciona listener para ajustar o modal quando o teclado virtual aparecer
        window.addEventListener('resize', () => this.adjustModalPosition(modal));
    }

    closeModal() {
        if (this.activeModal) {
            this.activeModal.classList.remove('active');
            document.body.style.overflow = '';
            this.activeModal = null;
        }
    }

    adjustModalPosition(modal) {
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent) return;

        // Reseta posições anteriores
        modalContent.style.transform = '';
        modalContent.style.top = '';
        modalContent.style.bottom = '';

        // Obtém dimensões
        const viewportHeight = window.innerHeight;
        const modalHeight = modalContent.offsetHeight;
        const isKeyboardOpen = window.innerHeight < window.outerHeight;

        if (isKeyboardOpen) {
            // Se o teclado estiver aberto, posiciona o modal mais acima
            modalContent.style.bottom = 'auto';
            modalContent.style.top = '5%';
            modalContent.style.maxHeight = '90vh';
        } else {
            // Centraliza o modal verticalmente
            if (modalHeight < viewportHeight) {
                modalContent.style.top = '50%';
                modalContent.style.transform = 'translateY(-50%)';
            } else {
                // Se o modal for maior que a viewport, ajusta para scroll
                modalContent.style.top = '0';
                modalContent.style.maxHeight = '100vh';
                modalContent.style.overflow = 'auto';
            }
        }
    }
}

// Gerenciador de botões para despesas fixas
class FixedExpenseButtonManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupButtonsLayout();
        this.setupButtonInteractions();
        // Atualiza o layout quando a tela é redimensionada
        window.addEventListener('resize', () => this.setupButtonsLayout());
    }

    setupButtonsLayout() {
        const expenseItems = document.querySelectorAll('.fixed-expense-item');
        const isMobile = window.innerWidth <= 768;

        expenseItems.forEach(item => {
            const actionsWrapper = item.querySelector('.expense-actions');
            const amountWrapper = item.querySelector('.expense-amount-wrapper');
            const amountElement = item.querySelector('.expense-amount');
            
            if (isMobile) {
                // Ajusta o layout para mobile
                this.adjustMobileLayout(item, actionsWrapper, amountWrapper, amountElement);
            } else {
                // Ajusta o layout para desktop
                this.adjustDesktopLayout(item, actionsWrapper, amountWrapper, amountElement);
            }
        });
    }

    adjustMobileLayout(item, actionsWrapper, amountWrapper, amountElement) {
        if (!actionsWrapper || !amountWrapper) return;

        // Ajusta o container principal
        item.style.position = 'relative';
        item.style.minHeight = '80px';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.padding = '1rem';

        // Ajusta o wrapper do valor e botões
        amountWrapper.style.display = 'flex';
        amountWrapper.style.alignItems = 'center';
        amountWrapper.style.gap = '0.5rem';
        amountWrapper.style.marginLeft = 'auto';
        amountWrapper.style.position = 'relative';

        // Ajusta o elemento do valor
        if (amountElement) {
            amountElement.style.marginRight = '0.5rem';
        }

        // Força os botões a ficarem na horizontal
        actionsWrapper.style.position = 'relative';
        actionsWrapper.style.display = 'flex';
        actionsWrapper.style.flexDirection = 'row';
        actionsWrapper.style.gap = '8px';
        actionsWrapper.style.marginLeft = '0.5rem';
        actionsWrapper.style.alignItems = 'center';
        actionsWrapper.style.justifyContent = 'flex-end';
        actionsWrapper.style.flexWrap = 'nowrap';
        actionsWrapper.style.width = 'auto';
        actionsWrapper.style.minWidth = '70px';

        // Ajusta os botões individualmente, incluindo o botão de check
        const allButtons = actionsWrapper.querySelectorAll('button');
        allButtons.forEach(button => {
            button.style.width = '32px';
            button.style.height = '32px';
            button.style.padding = '4px';
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            button.style.borderRadius = '4px';
            button.style.margin = '0';
            button.style.flexShrink = '0';
            button.style.position = 'relative';
            
            // Ajusta especificamente o botão de check em itens pagos
            if (item.classList.contains('paid') && button.classList.contains('pay-btn')) {
                button.style.backgroundColor = 'transparent';
                button.style.color = 'var(--success-color)';
            }
        });

        // Se o item estiver pago, ajusta o layout específico
        if (item.classList.contains('paid')) {
            actionsWrapper.style.position = 'relative';
            actionsWrapper.style.right = 'auto';
            actionsWrapper.style.top = 'auto';
            actionsWrapper.style.transform = 'none';
            actionsWrapper.style.display = 'flex';
            actionsWrapper.style.flexDirection = 'row';
            actionsWrapper.style.gap = '8px';
            actionsWrapper.style.marginLeft = '0.5rem';
        }
    }

    adjustDesktopLayout(item, actionsWrapper, amountWrapper, amountElement) {
        if (!actionsWrapper || !amountWrapper) return;

        // Remove os estilos específicos do mobile
        item.style.position = '';
        item.style.minHeight = '';
        item.style.display = '';
        item.style.alignItems = '';
        item.style.padding = '';

        amountWrapper.style.display = '';
        amountWrapper.style.alignItems = '';
        amountWrapper.style.gap = '';
        amountWrapper.style.marginLeft = '';
        amountWrapper.style.position = '';

        if (amountElement) {
            amountElement.style.marginRight = '';
        }

        actionsWrapper.style.position = '';
        actionsWrapper.style.display = 'flex';
        actionsWrapper.style.flexDirection = 'row';
        actionsWrapper.style.gap = '0.5rem';
        actionsWrapper.style.marginLeft = '1rem';
        actionsWrapper.style.alignItems = '';
        actionsWrapper.style.transform = '';

        // Remove estilos específicos dos botões
        const buttons = actionsWrapper.querySelectorAll('button');
        buttons.forEach(button => {
            button.style.width = '';
            button.style.height = '';
            button.style.padding = '';
            button.style.display = '';
            button.style.alignItems = '';
            button.style.justifyContent = '';
            button.style.borderRadius = '';
        });
    }

    setupButtonInteractions() {
        // Adiciona efeitos de hover e interações
        document.querySelectorAll('.edit-btn, .delete-btn').forEach(button => {
            // Adiciona efeito de hover
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.1)';
                button.style.transition = 'all 0.3s ease';
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
            });

            // Adiciona feedback tátil para mobile
            button.addEventListener('touchstart', () => {
                button.style.transform = 'scale(0.95)';
            });

            button.addEventListener('touchend', () => {
                button.style.transform = 'scale(1)';
            });
        });
    }
}

// Inicializa os gerenciadores
const mobileModalManager = new MobileModalManager();
const fixedExpenseButtonManager = new FixedExpenseButtonManager();

// Exporta para uso em outros arquivos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MobileModalManager,
        FixedExpenseButtonManager
    };
} 