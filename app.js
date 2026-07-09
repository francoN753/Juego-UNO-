// Autodetectar protocolo y host (soporta local y despliegues en la nube)
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
// Ya no usarías window.location.host
const socketUrl = "https://juego-uno-backend.onrender.com";
let socket;

// Variables de UI y estado local
let selectedComodinIndex = null;
let myTurn = false;

// Elementos del DOM
const sLogin = document.getElementById('screen-login');
const sWaiting = document.getElementById('screen-waiting');
const sGame = document.getElementById('screen-game');

const inputName = document.getElementById('username');
const btnJoin = document.getElementById('btn-join');
const playersList = document.getElementById('players-list');

const infoTurn = document.querySelector('#info-turn span');
const infoDirection = document.getElementById('info-direction');
const gameLog = document.getElementById('game-log');
const discardPile = document.getElementById('discard-pile');
const deck = document.getElementById('deck');
const playerHand = document.getElementById('player-hand');

const actionButtons = document.getElementById('action-buttons');
const btnUno = document.getElementById('btn-uno');
const btnCorte = document.getElementById('btn-corte');

const modalColor = document.getElementById('modal-color');
const modalPopup = document.getElementById('modal-popup');
const popupMessage = document.getElementById('popup-message');
const btnPopupResolve = document.getElementById('btn-popup-resolve');

// 1. Inicializar Conexión
btnJoin.addEventListener('click', () => {
    const name = inputName.value.trim();
    if (!name) return alert('Por favor ingresa un nombre.');

    socket = new WebSocket(socketUrl);

    socket.onopen = () => {
        sendToServer('joinGame', name);
        sLogin.classList.add('hidden');
        sWaiting.classList.remove('hidden');
    };

    socket.onmessage = (event) => {
        const { type, data } = JSON.parse(event.data);
        handleServerMessage(type, data);
    };

    socket.onclose = () => {
        alert('Conexión perdida con el servidor.');
        location.reload();
    };
});

// 2. Procesar Mensajes del Servidor Backend
function handleServerMessage(type, data) {
    switch (type) {
        case 'waitingRoom':
            playersList.innerHTML = data.map(name => `<li>👤 ${name}</li>`).join('');
            break;

        case 'gameState':
            renderGameState(data);
            break;

        case 'showPopup':
            popupMessage.innerText = data;
            modalPopup.classList.remove('hidden');
            break;

        case 'errorMsg':
            alert(`⚠️ Error: ${data}`);
            break;

        case 'gameOver':
            alert(`🏁 Fin del juego: ${data}`);
            location.reload();
            break;
    }
}

// 3. Pintar el estado del Juego
function renderGameState(state) {
    // Cambiar a pantalla de juego si empezó
    if (state.gameStarted) {
        sWaiting.classList.add('hidden');
        sGame.classList.remove('hidden');
    }

    // Actualizar Textos informativos
    myTurn = state.isMyTurn;
    infoTurn.innerText = state.isMyTurn ? "¡TU TURNO!" : state.currentTurnName;
    infoTurn.style.color = state.isMyTurn ? "#33cc33" : "#ffaa00";
    infoDirection.innerText = `Sentido: ${state.direction}`;

    // Agregar logs en tiempo real
    if (state.log) {
        gameLog.innerHTML += `<div>• ${state.log}</div>`;
        gameLog.scrollTop = gameLog.scrollHeight; // Auto-scroll al final
    }

    // Renderizar la carta del pozo de descarte
    if (state.topCard) {
        discardPile.className = `card card-${state.topCard.color}`;
        discardPile.innerHTML = `<span>${state.topCard.value}</span>`;
    }

    // Mostrar/Ocultar botonera especial (UNO / Corte)
    if (state.mostrarBotoneraUno) {
        actionButtons.classList.remove('hidden');
    } else {
        actionButtons.classList.add('hidden');
    }

    // Renderizar la mano del jugador
    playerHand.innerHTML = '';
    state.hand.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = `card card-${card.color}`;
        cardEl.innerHTML = `<span>${card.value}</span>`;

        // Evento para tirar la carta
        cardEl.addEventListener('click', () => tryPlayCard(index, card));
        playerHand.appendChild(cardEl);
    });
}

// 4. Intentar jugar una carta
function tryPlayCard(index, card) {
    if (!myTurn) return alert("No es tu turno de jugar.");

    if (card.color === 'Comodín') {
        selectedComodinIndex = index;
        modalColor.classList.remove('hidden'); // Abrir selector de color
    } else {
        sendToServer('playCard', { index });
    }
}

// Escuchar selección de color para Comodines
document.querySelectorAll('.btn-color').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const chosenColor = e.target.getAttribute('data-color');
        modalColor.classList.add('hidden');
        if (selectedComodinIndex !== null) {
            sendToServer('playCard', { index: selectedComodinIndex, chosenColor });
            selectedComodinIndex = null;
        }
    });
});

// Evento para Robar Carta (Click en el Mazo)
deck.addEventListener('click', () => {
    if (!myTurn) return alert("No es tu turno para robar.");
    sendToServer('drawCard');
});

// Eventos de Botonera Especial
btnUno.addEventListener('click', () => sendToServer('cantarUno'));
btnCorte.addEventListener('click', () => sendToServer('cantarCorte'));

// Botón de confirmación de Popups de penalización
btnPopupResolve.addEventListener('click', () => {
    modalPopup.classList.add('hidden');
    sendToServer('resolvePopup');
});

// Helper para enviar datos limpios por WS
function sendToServer(type, data = null) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, data }));
    }
}