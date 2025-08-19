// script.js

const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('cols');
const seedMazeInput = document.getElementById('seedMaze');
const btnGenerate = document.getElementById('btnGenerate');
const mazeInfo = document.getElementById('mazeInfo');

const popInput = document.getElementById('pop');
const gensInput = document.getElementById('gens');
const stepsInput = document.getElementById('steps');
const mutInput = document.getElementById('mut');
const elitInput = document.getElementById('elit');
const tkInput = document.getElementById('tk');
const historyInput = document.getElementById('history');
const seedGAInput = document.getElementById('seedGA');
const btnSolve = document.getElementById('btnSolve');
const solveInfo = document.getElementById('solveInfo');

// État courant côté front
let maze = null;		// {rows, cols, grid, start, goal}
let lastSolve = null; // {best_positions, history,...}
let cellSize = 16;	// calculé automatiquement selon canvas et grille

// ------------------------------------------------------------------
// Outils dessin
// ------------------------------------------------------------------
function computeCellSize(rows, cols) {
	// Laisser des marges, calculer la plus grande taille uniforme
	const pad = 10;
	const w = canvas.width - 2 * pad;
	const h = canvas.height - 2 * pad;
	const size = Math.floor(Math.min(w / cols, h / rows));
	return Math.max(size, 2);
}
function clearCanvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function drawGrid(mz) {
	clearCanvas();
	const padX = Math.floor((canvas.width - (cellSize * mz.cols)) / 2);
	const padY = Math.floor((canvas.height - (cellSize * mz.rows)) / 2);

	for (let r = 0; r < mz.rows; r++) {
	for (let c = 0; c < mz.cols; c++) {
		const v = mz.grid[r][c]; // 0 = mur, 1 = chemin
		if (v === 0) {
		ctx.fillStyle = '#222631'; // mur
		} else {
		ctx.fillStyle = '#fafafa'; // chemin
		}
		ctx.fillRect(padX + c * cellSize, padY + r * cellSize, cellSize, cellSize);
	}
	}
	// Start / Goal
	const [sr, sc] = mz.start;
	const [gr, gc] = mz.goal;
	// Start
	ctx.fillStyle = '#22c55e';
	ctx.fillRect(padX + sc * cellSize, padY + sr * cellSize, cellSize, cellSize);
	// Goal
	ctx.fillStyle = '#ef4444';
	ctx.fillRect(padX + gc * cellSize, padY + gr * cellSize, cellSize, cellSize);
}
function drawPath(mz, positions, color = '#60a5fa') {
	const padX = Math.floor((canvas.width - (cellSize * mz.cols)) / 2);
	const padY = Math.floor((canvas.height - (cellSize * mz.rows)) / 2);
	ctx.fillStyle = color;
	for (const [r, c] of positions) {
	ctx.fillRect(padX + c * cellSize + 2, padY + r * cellSize + 2, cellSize - 4, cellSize - 4);
	}
}
function drawPolyline(mz, positions, color = '#0ea5e9', width = 3) {
	const padX = Math.floor((canvas.width - (cellSize * mz.cols)) / 2);
	const padY = Math.floor((canvas.height - (cellSize * mz.rows)) / 2);
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.beginPath();
	const p0 = positions[0];
	ctx.moveTo(padX + p0[1] * cellSize + cellSize / 2, padY + p0[0] * cellSize + cellSize / 2);
	for (let i = 1; i < positions.length; i++) {
	const [r, c] = positions[i];
	ctx.lineTo(padX + c * cellSize + cellSize / 2, padY + r * cellSize + cellSize / 2);
	}
	ctx.stroke();
}

function cellCenter(mz, r, c) {
	const padX = Math.floor((canvas.width - (cellSize * mz.cols)) / 2);
	const padY = Math.floor((canvas.height - (cellSize * mz.rows)) / 2);
	return {
	x: padX + c * cellSize + cellSize / 2,
	y: padY + r * cellSize + cellSize / 2
	};
}

function drawHead(mz, r, c, color = '#f97316', radius = Math.max(3, Math.floor(cellSize * 0.3))) {
	const { x, y } = cellCenter(mz, r, c);
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fill();
}

function drawCollisionMark(mz, r, c, color = '#ef4444') {
	const { x, y } = cellCenter(mz, r, c);
	const d = Math.max(2, Math.floor(cellSize * 0.3));
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d);
	ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d);
	ctx.stroke();
}

// ------------------------------------------------------------------
// API helpers
// ------------------------------------------------------------------
async function apiGenerate(rows, cols, seed) {
	const params = new URLSearchParams();
	params.set('rows', rows);
	params.set('cols', cols);
	if (seed !== undefined && seed !== null && seed !== '') params.set('seed', seed);
	const res = await fetch(`/api/generate?${params.toString()}`);
	if (!res.ok) throw new Error('Erreur génération');
	return res.json();
}
async function apiMaze() {
	const res = await fetch('/api/maze');
	if (!res.ok) throw new Error('Erreur récupération maze');
	return res.json();
}
async function apiSolve(opts) {
	const res = await fetch('/api/solve', {
	method: 'POST',
	headers: {'Content-Type': 'application/json'},
	body: JSON.stringify(opts || {})
	});
	if (!res.ok) throw new Error('Erreur solve');
	return res.json();
}

// ------------------------------------------------------------------
// UI logic
// ------------------------------------------------------------------
btnGenerate.addEventListener('click', async () => {
	btnGenerate.disabled = true;
	mazeInfo.textContent = 'Génération…';
	try {
	const rows = Number(rowsInput.value || 31);
	const cols = Number(colsInput.value || 41);
	const seed = seedMazeInput.value;

	const data = await apiGenerate(rows, cols, seed);
	maze = {
		rows: data.rows,
		cols: data.cols,
		grid: data.grid,
		start: data.start,
		goal: data.goal
	};
	cellSize = computeCellSize(maze.rows, maze.cols);
	drawGrid(maze);
	mazeInfo.textContent = `OK (${maze.rows}x${maze.cols})`;
	solveInfo.textContent = '';
	lastSolve = null;
	} catch (e) {
	console.error(e);
	mazeInfo.textContent = 'Erreur.';
	} finally {
	btnGenerate.disabled = false;
	}
});

btnSolve.addEventListener('click', async () => {
	if (!maze) {
	// récupère s’il existe côté serveur
	maze = await apiMaze();
	cellSize = computeCellSize(maze.rows, maze.cols);
	drawGrid(maze);
	}
	btnSolve.disabled = true;
	solveInfo.textContent = 'Calcul en cours…';
	try {
	const opts = {
		pop_size: Number(popInput.value || 150),
		generations: Number(gensInput.value || 150),
		max_steps: Number(stepsInput.value || 800),
		mut_rate: Number(mutInput.value || 0.03),
		elitism: Number(elitInput.value || 2),
		tournament_k: Number(tkInput.value || 3),
		history: Boolean(historyInput.checked),
		seed: seedGAInput.value
	};
	const res = await apiSolve(opts);
	lastSolve = res;

	// Dessin final + (optionnel) animation de l'historique
	drawGrid(maze);

	if (Array.isArray(res.history) && res.history.length > 0) {
		// Animation de la progression du meilleur
		solveInfo.textContent = `Historique reçu (${res.history.length} générations). Animation…`;
		await animateHistory(res.history);
	}

	
	if (Array.isArray(res.best_trace) && res.best_trace.length > 0) {
		solveInfo.textContent = 'Rejeu du meilleur chemin, pas à pas…';
		await animateBestTrace(res.best_trace);
	}

	// Dessin du meilleur final en surbrillance
	drawPolyline(maze, res.best_positions, '#f59e0b', 4);
	solveInfo.textContent = (res.best_reached)
		? `Arrivée trouvée en ${res.best_steps_to_goal} pas • fitness=${res.best_fitness.toFixed(4)}`
		: `Arrivée non atteinte • fitness meilleur=${res.best_fitness.toFixed(4)}`;
	} catch (e) {
	console.error(e);
	solveInfo.textContent = 'Erreur.';
	} finally {
	btnSolve.disabled = false;
	}
});

async function animateHistory(history) {
	// Redessine le labyrinthe et superpose la meilleure trajectoire de chaque génération
	// Utilise requestAnimationFrame pour fluidité.
	for (let i = 0; i < history.length; i++) {
	drawGrid(maze);
	// chemin courant
	const h = history[i];
	drawPolyline(maze, h.positions, '#60a5fa', 3);
	// meilleur précédent en plus fin (optionnel)
	if (i > 0) drawPolyline(maze, history[i-1].positions, '#3b82f6', 2);
	await rafDelay(18); // ~60 fps => 16ms; un peu plus pour respirer
	}
}

async function animateBestTrace(trace, colorPath = '#0ea5e9') {
	// On peut lire une vitesse si un slider #speed existe, sinon défaut 35ms
	const stepDelay = Number(document.getElementById('speed')?.value || 35);
	const path = [];

	for (let i = 0; i < trace.length; i++) {
	const t = trace[i];
	path.push(t.pos);

	drawGrid(maze);
	drawPolyline(maze, path, colorPath, 3);
	drawHead(maze, t.pos[0], t.pos[1], '#f59e0b');

	if (t.coll) {
		drawCollisionMark(maze, t.pos[0], t.pos[1]);
	}

	// feedback textuel pendant la lecture
	solveInfo.textContent = `Pas ${t.i + 1}/${trace.length} • move=${['↑','→','↓','←'][t.move]} • `
		+ (t.ok ? 'OK' : 'collision') + ` • dist=${t.dist}`;

	await rafDelay(stepDelay);
	}
}

function rafDelay(ms) {
	return new Promise((resolve) => {
	const start = performance.now();
	function tick(now) {
		if (now - start >= ms) resolve();
		else requestAnimationFrame(tick);
	}
	requestAnimationFrame(tick);
	});
}

// Chargement initial : récupérer/afficher le labyrinthe par défaut
(async function init() {
	try {
	const data = await apiMaze();
	maze = data;
	cellSize = computeCellSize(maze.rows, maze.cols);
	drawGrid(maze);
	} catch (e) {
	console.error(e);
	}
})();
