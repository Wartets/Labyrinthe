const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('cols');
const seedMazeInput = document.getElementById('seedMaze');
const opennessInput = document.getElementById('openness');
const closenessInput = document.getElementById('closeness');
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
const speedInput = document.getElementById('speed');

let maze = null;
let lastSolve = null;
let cellSize = 16;
let isSolving = false;
let bestPathToKeep = null;

function computeCellSize(rows, cols) {
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
            const v = mz.grid[r][c];
            if (v === 0) {
                ctx.fillStyle = '#222631';
            } else {
                ctx.fillStyle = '#fafafa';
            }
            ctx.fillRect(padX + c * cellSize, padY + r * cellSize, cellSize, cellSize);
        }
    }
    const [sr, sc] = mz.start;
    const [gr, gc] = mz.goal;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(padX + sc * cellSize, padY + sr * cellSize, cellSize, cellSize);
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
    if (positions.length < 2) return;
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

async function apiGenerate(rows, cols, seed, openness, closeness) {
    const params = new URLSearchParams();
    params.set('rows', rows);
    params.set('cols', cols);
    if (seed !== undefined && seed !== null && seed !== '') params.set('seed', seed);
    params.set('openness', openness);
    params.set('closeness', closeness);
    const res = await fetch(`/api/generate?${params.toString()}`);
    if (!res.ok) throw new Error('Erreur génération');
    return res.json();
}

async function apiMaze() {
    const res = await fetch('/api/maze');
    if (!res.ok) throw new Error('Erreur récupération maze');
    return res.json();
}

async function apiSolveStream(opts) {
    const res = await fetch('/api/solve_stream', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(opts || {})
    });
    if (!res.ok) throw new Error('Erreur solve');
    return res.body;
}

btnGenerate.addEventListener('click', async () => {
    if (isSolving) return;
    btnGenerate.disabled = true;
    mazeInfo.textContent = 'Génération…';
    try {
        const rows = Number(rowsInput.value || 31);
        const cols = Number(colsInput.value || 41);
        const seed = seedMazeInput.value;
        const openness = Number(opennessInput.value || 0.0);
        const closeness = Number(closenessInput.value || 0.0);

        const data = await apiGenerate(rows, cols, seed, openness, closeness);
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
        bestPathToKeep = null;
    } catch (e) {
        console.error(e);
        mazeInfo.textContent = 'Erreur.';
    } finally {
        btnGenerate.disabled = false;
    }
});

btnSolve.addEventListener('click', async () => {
    if (isSolving) return;
    isSolving = true;
    if (!maze) {
        maze = await apiMaze();
        cellSize = computeCellSize(maze.rows, maze.cols);
        drawGrid(maze);
    }
    btnSolve.disabled = true;
    solveInfo.textContent = 'Calcul en cours…';
    try {
        bestPathToKeep = null;
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
        const speed = Number(speedInput.value);

        const stream = await apiSolveStream(opts);
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        const colors = {};
        function getPathColor(pathId) {
            if (!colors[pathId]) {
                const hue = (pathId * 137.508) % 360; // Golden angle
                colors[pathId] = `hsl(${hue}, 70%, 50%)`;
            }
            return colors[pathId];
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop();

            for (const event of events) {
                if (!event.startsWith('data: ')) continue;
                try {
                    const data = JSON.parse(event.substring(6));

                    if (data.type === 'history') {
                        drawGrid(maze);
                        const allPaths = data.all_positions || [];
                        const bestOfGenPath = data.positions;
                        const bestOfAllTimePath = data.best_of_all_time_positions;
                        
                        // Draw all paths with a different color and thickness
                        allPaths.forEach((path, index) => {
                            if (path.length > 0) {
                                drawPolyline(maze, path, getPathColor(index), 2);
                            }
                        });

                        // Draw best of current generation path
                        if (bestOfGenPath) {
                            drawPolyline(maze, bestOfGenPath, '#60a5fa', 3);
                        }

                        // Draw best of all time path with a thicker line
                        if (bestOfAllTimePath) {
                            drawPolyline(maze, bestOfAllTimePath, '#f59e0b', 4);
                            bestPathToKeep = bestOfAllTimePath;
                        }
                        
                        solveInfo.textContent = `Génération ${data.generation + 1} • fitness: ${data.fitness.toFixed(4)}`;
                        await rafDelay(speed);
                    } else if (data.type === 'final') {
                        lastSolve = data;
                        drawGrid(maze);
                        drawPolyline(maze, data.best_positions, '#f59e0b', 4);

                        solveInfo.textContent = (data.best_reached)
                            ? `Arrivée trouvée en ${data.best_steps_to_goal} pas • fitness=${data.best_fitness.toFixed(4)}`
                            : `Arrivée non atteinte • fitness meilleur=${data.best_fitness.toFixed(4)}`;

                        await animateBestTrace(data.best_trace);
                        break;
                    }
                } catch (e) {
                    console.error("Erreur de parsing JSON:", e, "sur l'événement:", event);
                    continue;
                }
            }
        }
    } catch (e) {
        console.error("Erreur de stream:", e);
        solveInfo.textContent = 'Erreur.';
    } finally {
        btnSolve.disabled = false;
        isSolving = false;
    }
});

async function animateBestTrace(trace, colorPath = '#0ea5e9') {
    const stepDelay = Number(speedInput.value);
    const path = [];
    
    for (let i = 0; i < trace.length; i++) {
        const t = trace[i];
        if (i > 0 && trace[i-1].pos[0] === t.pos[0] && trace[i-1].pos[1] === t.pos[1] && !t.ok) {
        } else {
            path.push(t.pos);
        }

        drawGrid(maze);
        drawPolyline(maze, bestPathToKeep, '#f59e0b', 4);
        drawPolyline(maze, path, colorPath, 3);
        drawHead(maze, t.pos[0], t.pos[1], '#f97316');

        if (t.coll) {
            drawCollisionMark(maze, t.pos[0], t.pos[1]);
        }

        solveInfo.textContent = `Rejeu: Pas ${t.i + 1}/${trace.length} • move=${['↑','→','↓','←'][t.move]} • `
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