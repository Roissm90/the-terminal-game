const terminal = document.getElementById('terminal');
const input = document.getElementById('commandInput');
const hints = document.getElementById('hints');

let inspectedNode = null;
let inputBlocked = false;
let timeLeft = 300; // Tiempo en segundos
let timerInterval = null; // <- NUEVO

let terminalHistory = [];
let addingFinalMessage = false;

function show(text) {
  if (addingFinalMessage) {
    const line = document.createElement('div');
    line.innerHTML = text.replace(/\n/g, '<br>');
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
    return;
  }

  terminalHistory.push(text);

  const line = document.createElement('div');
  line.innerHTML = text.replace(/\n/g, '<br>');
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function renderTerminal() {
  terminal.innerHTML = terminalHistory.map(line => `<div>${line.replace(/\n/g, '<br>')}</div>`).join('');
  terminal.scrollTop = terminal.scrollHeight;
}

function showHint() {
  hints.textContent = 'Comandos: scan, trace [ip], inspect [ip], open [archivo], isolate [ip]';
}

function blockInput(reason) {
  input.disabled = true;
  inputBlocked = true;

  if (timerInterval) clearInterval(timerInterval); // <- DETIENE EL TIMER SIEMPRE

  if (reason === 'time') {
    let fullText = terminalHistory.join('\n');
    let i = 0;

    const interval = setInterval(() => {
      i++;
      let partial = fullText.slice(i);
      terminal.innerHTML = partial
        .split('\n')
        .map(line => `<div>${line.replace(/\n/g, '<br>')}</div>`)
        .join('');
      terminal.scrollTop = terminal.scrollHeight;

      if (i >= fullText.length) {
        clearInterval(interval);
        addingFinalMessage = true;
        show('<br><strong style="color:red;">No has llegado a tiempo, ataque completado.</strong>');
        addingFinalMessage = false;
      }
    }, 30);
  }

  if (reason === 'win') {
    show('<br><strong style="color:lime;">Nodo aislado. Has detenido el ataque.</strong>');
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
  document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft < 0 && !inputBlocked) {
      clearInterval(timerInterval);
      blockInput('time');
      return;
    }
    updateTimerDisplay();
  }, 1000);
}

const nodes = {
  "192.168.0.2": { trace: ["192.168.0.1", "10.0.0.9", "173.45.12.33"] },
  "192.168.0.5": { trace: ["192.168.0.3", "10.0.0.12", "51.87.23.14"] },
  "192.168.0.8": { trace: ["192.168.0.7", "10.0.0.18", "98.22.11.4"] },
  "10.0.0.12": {
    files: {
      "malware.log": "Detectada conexión desde 51.87.23.14. Posible origen del ataque.",
      "network.txt": "Conexiones múltiples detectadas."
    }
  },
  "51.87.23.14": {
    files: {
      "rootkit.sys": "Archivo sospechoso con firma digital inválida.",
      "readme.txt": "Este nodo no debería estar aquí..."
    }
  },
  "10.0.0.9": { files: { "notes.txt": "Sin actividad sospechosa." } },
  "173.45.12.33": { files: { "report.log": "Servidor no responde desde hace 3 días." } },
  "192.168.0.7": { trace: ["10.0.0.44", "12.22.33.44"] },
  "10.0.0.44": { files: { "temp.dat": "Archivo vacío." } },
  "12.22.33.44": { files: { "useless.txt": "Nada interesante aquí." } },
  "10.0.0.18": {},
  "98.22.11.4": {}
};

function handleCommand(inputText) {
  if (inputBlocked) return;

  const text = inputText.trim();
  if (!text) return;

  const parts = text.split(' ');
  const cmd = parts[0];
  const arg = parts.slice(1).join(' ');

  if (cmd === 'scan') {
    const ips = Object.keys(nodes).slice(0, 5);
    show('IP´s encontradas:\n- ' + ips.join('\n- '));
  }

  else if (cmd === 'trace') {
    const target = nodes[arg];
    if (target && target.trace) {
      show(`Rastreo de ${arg}:\nOrigen → ${target.trace.join(' → ')}`);
    } else {
      show('IP no rastreable o inexistente.');
    }
  }

  else if (cmd === 'inspect') {
    const target = nodes[arg];
    if (target && target.files) {
      inspectedNode = arg;
      const fileList = Object.keys(target.files).join('\n- ');
      show(`Archivos en ${arg}:\n- ${fileList}`);
    } else {
      inspectedNode = null;
      show('Este nodo no contiene archivos o no existe.');
    }
  }

  else if (cmd === 'open') {
    if (!inspectedNode) {
      show('Primero debes hacer inspect a una IP con archivos.');
    } else {
      const fileContent = nodes[inspectedNode]?.files?.[arg];
      if (fileContent) {
        show(`Contenido de ${arg}:\n${fileContent}`);
      } else {
        show('Archivo no encontrado en el nodo actual.');
      }
    }
  }

  else if (cmd === 'isolate') {
    if (arg === '51.87.23.14') {
      blockInput('win'); // <- Esto ahora también detiene el contador
    } else {
      show(`El nodo ${arg} no representa una amenaza o no puede ser aislado.`);
    }
  }

  else if (cmd === 'help') {
    show('Comandos disponibles:\n- scan\n- trace [ip]\n- inspect [ip]\n- open [archivo]\n- isolate [ip]');
  }

  else {
    show('Comando no reconocido. Escribe help para ver opciones.');
  }

  showHint();
}

input.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const text = input.value;
    if (text) {
      show('> ' + text);
      handleCommand(text);
      input.value = '';
    }
  }
});

show('<p class="welcome">Bienvenido a Red Hunt. Escribe help para comenzar</p>');
showHint();
startTimer();
