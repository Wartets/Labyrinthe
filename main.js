document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.getElementById('mazeCanvas');
	const ctx = canvas.getContext('2d');

	const mazeSizeSlider = document.getElementById('mazeSize');
	const mazeSizeValue = document.getElementById('mazeSizeValue');
	const mazeSizeInfo = document.getElementById('mazeSizeInfo');
	const opennessRateSlider = document.getElementById('opennessRate');	
	const opennessRateValue = document.getElementById('opennessRateValue');
	const mazeAlgorithmSelect = document.getElementById('mazeAlgorithm');
	const seedInput = document.getElementById('seedInput');
	const randomSeedBtn = document.getElementById('randomSeedBtn');

	const populationSizeSlider = document.getElementById('populationSize');
	const populationSizeValue = document.getElementById('populationSizeValue');
	const generationsSlider = document.getElementById('generations');
	const generationsValue = document.getElementById('generationsValue');
	const mutationRateSlider = document.getElementById('mutationRate');
	const mutationRateValue = document.getElementById('mutationRateValue');

	const tournamentSizeSlider = document.getElementById('tournamentSize');
	const tournamentSizeValue = document.getElementById('tournamentSizeValue');
	const elitismRateSlider = document.getElementById('elitismRate');
	const elitismRateValue = document.getElementById('elitismRateValue');
	
	const animSpeedSlider = document.getElementById('animSpeed');
	const animSpeedValue = document.getElementById('animSpeedValue');

	const pathLengthMultiplierSlider = document.getElementById('pathLengthMultiplier');
	const pathLengthMultiplierValue = document.getElementById('pathLengthMultiplierValue');
	
	const generateBtn = document.getElementById('generateBtn');
	const solveBtn = document.getElementById('solveBtn');
	const statusMessage = document.getElementById('status-message');

	const opennessRateDiv = document.getElementById('opennessRate').parentElement;
	const seedDiv = document.getElementById('seedInput').parentElement.parentElement;
	const drawingToolsPanel = document.getElementById('drawingTools');
	const drawWallBtn = document.getElementById('drawWallBtn');
	const drawOneWayBtn = document.getElementById('drawOneWayBtn');
	const drawLimitedBtn = document.getElementById('drawLimitedBtn');
	const eraseWallBtn = document.getElementById('eraseWallBtn');
	const clearMazeBtn = document.getElementById('clearMazeBtn');

	const crossoverRateSlider = document.getElementById('crossoverRate');
	const crossoverRateValue = document.getElementById('crossoverRateValue');
	const crossoverTypeSelect = document.getElementById('crossoverType');
	const mutationTypeSelect = document.getElementById('mutationType');
	const diversityPressureSlider = document.getElementById('diversityPressure');
	const diversityPressureValue = document.getElementById('diversityPressureValue');
	const selectionPressureSlider = document.getElementById('selectionPressure');
	const selectionPressureValue = document.getElementById('selectionPressureValue');
	const distanceWeightSlider = document.getElementById('distanceWeight');
	const distanceWeightValue = document.getElementById('distanceWeightValue');
	const pathLengthWeightSlider = document.getElementById('pathLengthWeight');
	const pathLengthWeightValue = document.getElementById('pathLengthWeightValue');
	const turnsWeightSlider = document.getElementById('turnsWeight');
	const turnsWeightValue = document.getElementById('turnsWeightValue');
	const progressWeightSlider = document.getElementById('progressWeight');
	const progressWeightValue = document.getElementById('progressWeightValue');
	const collisionPenaltySlider = document.getElementById('collisionPenalty');
	const collisionPenaltyValue = document.getElementById('collisionPenaltyValue');

	const PATH = 0;
	const WALL = 1;
	const ONE_WAY = 2;
	const LIMITED_PASS = 3;

    const directions = ['north', 'east', 'south', 'west'];
    const directionArrows = { 'north': '↓', 'east': '←', 'south': '↑', 'west': '→' };

	let maze, start, end, size;
	let cellSize;
	let isSolving = false;

	let drawingMode = null;
	let isDrawing = false;

	let currentSeed = Date.now();

	function setSeed(seed) {
		currentSeed = seed;
	}

	function seededRandom() {
		currentSeed = (currentSeed * 9301 + 49297) % 233280;
		return currentSeed / 233280;
	}

	function hasValidPath(mazeGrid, startPos, endPos) {
		const rows = mazeGrid.length;
		const cols = mazeGrid[0].length;
		const queue = [{ x: startPos.x, y: startPos.y, path: [], visited: new Set(), passesRemaining: {} }];
		queue[0].visited.add(`${startPos.x},${startPos.y}`);

		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				if (typeof mazeGrid[y][x] === 'object' && mazeGrid[y][x].type === LIMITED_PASS) {
					queue[0].passesRemaining[`${x},${y}`] = mazeGrid[y][x].passes;
				}
			}
		}

		const dx = [0, 0, 1, -1];
		const dy = [1, -1, 0, 0];

		while (queue.length > 0) {
			const { x, y, path, visited, passesRemaining } = queue.shift();

			if (x === endPos.x && y === endPos.y) {
				return { pathFound: true, shortestPath: [...path, { x, y }] };
			}

			for (let i = 0; i < 4; i++) {
				const newX = x + dx[i];
				const newY = y + dy[i];
				const newPosKey = `${newX},${newY}`;

				if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
					const cell = mazeGrid[newY][newX];
					
					if (cell === WALL) continue;
					
					if (typeof cell === 'object' && cell.type === ONE_WAY) {
						const direction = cell.direction;
						const allowed = 
							(direction === 'north' && i === 2) ||
							(direction === 'south' && i === 3) ||
							(direction === 'east' && i === 1) ||
							(direction === 'west' && i === 0);
						if (!allowed) continue;
					}
					
					if (typeof cell === 'object' && cell.type === LIMITED_PASS) {
						const remaining = passesRemaining[newPosKey] || cell.passes;
						if (remaining <= 0) continue;
					}

					if (!visited.has(newPosKey)) {
						const newVisited = new Set(visited);
						const newPassesRemaining = { ...passesRemaining };
						
						if (typeof cell === 'object' && cell.type === LIMITED_PASS) {
							newPassesRemaining[newPosKey] = (newPassesRemaining[newPosKey] || cell.passes) - 1;
						}
						
						newVisited.add(newPosKey);
						queue.push({
							x: newX,
							y: newY,
							path: [...path, { x, y }],
							visited: newVisited,
							passesRemaining: newPassesRemaining
						});
					}
				}
			}
		}

		return { pathFound: false, shortestPath: null };
	}

	const updateSliderValue = (slider, display, formatter) => {
		display.textContent = formatter(slider.value);
		slider.addEventListener('input', (e) => {
			display.textContent = formatter(e.target.value);
		});
	};

	updateSliderValue(mazeSizeSlider, mazeSizeValue, v => `${v}x${v}`);
	updateSliderValue(opennessRateSlider, opennessRateValue, v => `${v}%`);
	updateSliderValue(populationSizeSlider, populationSizeValue, v => v);
	updateSliderValue(generationsSlider, generationsValue, v => v);
	updateSliderValue(mutationRateSlider, mutationRateValue, v => `${v}%`);
	updateSliderValue(tournamentSizeSlider, tournamentSizeValue, v => v);
	updateSliderValue(elitismRateSlider, elitismRateValue, v => `${v}%`);
	updateSliderValue(pathLengthMultiplierSlider, pathLengthMultiplierValue, v => `${v}x`);
	updateSliderValue(animSpeedSlider, animSpeedValue, v => `${v}ms`);
	updateSliderValue(crossoverRateSlider, crossoverRateValue, v => `${v}%`);
	updateSliderValue(diversityPressureSlider, diversityPressureValue, v => `${v}%`);
	updateSliderValue(selectionPressureSlider, selectionPressureValue, v => v);
	updateSliderValue(distanceWeightSlider, distanceWeightValue, v => v);
	updateSliderValue(pathLengthWeightSlider, pathLengthWeightValue, v => v);
	updateSliderValue(turnsWeightSlider, turnsWeightValue, v => v);
	updateSliderValue(progressWeightSlider, progressWeightValue, v => v);
	updateSliderValue(collisionPenaltySlider, collisionPenaltyValue, v => v);

	mazeSizeSlider.addEventListener('input', () => {
		if (mazeAlgorithmSelect.value === 'manual' && maze) {
			const newSize = parseInt(mazeSizeSlider.value);
			
			if (newSize !== size) {
				resizeMaze(newSize);
				drawMaze();
				statusMessage.textContent = `Labyrinthe redimensionné à ${newSize}x${newSize}. Vous pouvez continuer à dessiner.`;
			}
		}
	});

	mazeAlgorithmSelect.addEventListener('change', (e) => {
		const selectedMode = e.target.value;
		const isManual = selectedMode === 'manual';

		opennessRateDiv.style.display = isManual ? 'none' : 'block';
		seedDiv.style.display = isManual ? 'none' : 'block';
		drawingToolsPanel.style.display = isManual ? 'block' : 'none';

		generateBtn.textContent = isManual ? `Vérifier l'existence d'une solution` : 'Générer un Labyrinthe';
		
		updateMazeSizeInfo();
	});
	
	randomSeedBtn.addEventListener('click', () => {
		const newSeed = Math.floor(Math.random() * 1000000000);
		seedInput.value = newSeed;
		setSeed(newSeed);
	});

	seedInput.addEventListener('input', () => {
		const seedVal = parseInt(seedInput.value);
		if (!isNaN(seedVal)) {
			setSeed(seedVal);
		} else {
			setSeed(Date.now());	
		}
	});

	function updateMazeSizeInfo() {
		if (mazeAlgorithmSelect.value === 'manual') {
			mazeSizeInfo.textContent = "Redimensionne le labyrinthe actuel en adaptant le dessin à la nouvelle taille.";
		} else {
			mazeSizeInfo.textContent = "Définit la largeur et la hauteur de la grille du labyrinthe.";
		}
	}

	function generateMazeDFS(width, height, opennessPercent, currentMazeSeed) {
		setSeed(currentMazeSeed);

		let mazeGrid = Array(height).fill(null).map(() => Array(width).fill(WALL));
		let stack = [];
		let startX = 1, startY = 1;

		mazeGrid[startY][startX] = PATH;
		stack.push([startX, startY]);

		while (stack.length > 0) {
			let [x, y] = stack[stack.length - 1];
			let neighbors = [];

			[[x, y - 2], [x, y + 2], [x - 2, y], [x + 2, y]].forEach(([nx, ny]) => {
				if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && mazeGrid[ny][nx] === WALL) {
					neighbors.push([nx, ny]);
				}
			});

			if (neighbors.length > 0) {
				let [nextX, nextY] = neighbors[Math.floor(seededRandom() * neighbors.length)];
				mazeGrid[nextY][nextX] = PATH;
				mazeGrid[y + (nextY - y) / 2][x + (nextX - x) / 2] = PATH;
				stack.push([nextX, nextY]);
			} else {
				stack.pop();
			}
		}
		
		start = { x: 1, y: 1 };
		end = { x: width - 2, y: height - 2 };
		mazeGrid[start.y][start.x] = PATH;
		mazeGrid[end.y][end.x] = PATH;
		
		if (mazeGrid[height - 3][width - 2] === WALL) mazeGrid[height - 3][width - 2] = PATH;
		if (mazeGrid[height - 2][width - 3] === WALL) mazeGrid[height - 2][width - 3] = PATH;

		const opennessThreshold = opennessPercent / 100;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				if (mazeGrid[y][x] === WALL) {
					let pathNeighbors = 0;
					if (y > 0 && mazeGrid[y-1] && mazeGrid[y-1][x] === PATH) pathNeighbors++;
					if (y < height-1 && mazeGrid[y+1] && mazeGrid[y+1][x] === PATH) pathNeighbors++;
					if (x > 0 && mazeGrid[y][x-1] === PATH) pathNeighbors++;
					if (x < width-1 && mazeGrid[y][x+1] === PATH) pathNeighbors++;
					
					if (pathNeighbors > 0 && seededRandom() < opennessThreshold) {
						mazeGrid[y][x] = PATH;
					}
				}
			}
		}
		return mazeGrid;
	}

	function generateMazePrim(width, height, opennessPercent, currentMazeSeed) {
		setSeed(currentMazeSeed);
		let mazeGrid = Array(height).fill(null).map(() => Array(width).fill(WALL));
		let frontier = []; 

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				mazeGrid[y][x] = WALL;
			}
		}

		let startCellX = Math.floor(seededRandom() * ((width - 2) / 2)) * 2 + 1;
		let startCellY = Math.floor(seededRandom() * ((height - 2) / 2)) * 2 + 1;

		mazeGrid[startCellY][startCellX] = PATH;

		function addWallsToFrontier(x, y) {
			const potentialWalls = [
				{wallX: x, wallY: y - 1, nextCellX: x, nextCellY: y - 2},
				{wallX: x, wallY: y + 1, nextCellX: x, nextCellY: y + 2},
				{wallX: x - 1, wallY: y, nextCellX: x - 2, nextCellY: y},
				{wallX: x + 1, wallY: y, nextCellX: x + 2, nextCellY: y}
			];

			potentialWalls.forEach(pWall => {
				if (pWall.wallX > 0 && pWall.wallX < width - 1 && pWall.wallY > 0 && pWall.wallY < height - 1) {
					if (mazeGrid[pWall.wallY][pWall.wallX] === WALL && 
						pWall.nextCellY > 0 && pWall.nextCellY < height - 1 &&
						pWall.nextCellX > 0 && pWall.nextCellX < width - 1 &&
						mazeGrid[pWall.nextCellY][pWall.nextCellX] === WALL) {
						
						frontier.push({wallX: pWall.wallX, wallY: pWall.wallY, nextCellX: pWall.nextCellX, nextCellY: pWall.nextCellY});
					}
				}
			});
		}

		addWallsToFrontier(startCellX, startCellY);

		while (frontier.length > 0) {
			const randomIndex = Math.floor(seededRandom() * frontier.length);
			const {wallX, wallY, nextCellX, nextCellY} = frontier[randomIndex];

			if (mazeGrid[nextCellY][nextCellX] === WALL) {
				mazeGrid[wallY][wallX] = PATH;
				mazeGrid[nextCellY][nextCellX] = PATH;
				addWallsToFrontier(nextCellX, nextCellY);
			}
			frontier.splice(randomIndex, 1);
		}

		for (let i = 0; i < width; i++) {
			mazeGrid[0][i] = WALL;
			mazeGrid[height - 1][i] = WALL;
		}
		for (let i = 0; i < height; i++) {
			mazeGrid[i][0] = WALL;
			mazeGrid[i][width - 1] = WALL;
		}

		start = { x: 1, y: 1 };
		end = { x: width - 2, y: height - 2 };
		mazeGrid[start.y][start.x] = PATH;
		mazeGrid[end.y][end.x] = PATH;

		const opennessThreshold = opennessPercent / 100;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				if (mazeGrid[y][x] === WALL) {
					let pathNeighbors = 0;
					if (mazeGrid[y-1] && mazeGrid[y-1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y+1] && mazeGrid[y+1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y][x-1] === PATH) pathNeighbors++;
					if (mazeGrid[y][x+1] === PATH) pathNeighbors++;
					
					if (pathNeighbors > 0 && seededRandom() < opennessThreshold) {
						mazeGrid[y][x] = PATH;
					}
				}
			}
		}
		return mazeGrid;
	}

	function generateMazeKruskal(width, height, opennessPercent, currentMazeSeed) {
		setSeed(currentMazeSeed);
		let mazeGrid = Array(height).fill(null).map(() => Array(width).fill(WALL));
		
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				mazeGrid[y][x] = WALL;
			}
		}

		const sets = new Map();
		let nextSetId = 0;

		let walls = [];

		for (let y = 1; y < height - 1; y += 2) {
			for (let x = 1; x < width - 1; x += 2) {
				mazeGrid[y][x] = PATH;
				sets.set(`${x},${y}`, nextSetId++);

				if (x + 2 < width - 1) {
					walls.push({ x1: x, y1: y, x2: x + 2, y2: y, wallX: x + 1, wallY: y });
				}
				if (y + 2 < height - 1) {
					walls.push({ x1: x, y1: y, x2: x, y2: y + 2, wallX: x, wallY: y + 1 });
				}
			}
		}

		for (let i = walls.length - 1; i > 0; i--) {
			const j = Math.floor(seededRandom() * (i + 1));
			[walls[i], walls[j]] = [walls[j], walls[i]];
		}

		function findSet(cell) {
			const id = sets.get(`${cell.x},${cell.y}`);
			return id;
		}

		function unionSets(cell1, cell2, wall) {
			const set1 = findSet(cell1);
			const set2 = findSet(cell2);

			if (set1 !== set2) {
				mazeGrid[wall.wallY][wall.wallX] = PATH;

				for (let [key, value] of sets.entries()) {
					if (value === set2) {
						sets.set(key, set1);
					}
				}
				return true;
			}
			return false;
		}

		for (const wall of walls) {
			const cell1 = { x: wall.x1, y: wall.y1 };
			const cell2 = { x: wall.x2, y: wall.y2 };

			unionSets(cell1, cell2, wall);
		}

		start = { x: 1, y: 1 };
		end = { x: width - 2, y: height - 2 };
		mazeGrid[start.y][start.x] = PATH;
		mazeGrid[end.y][end.x] = PATH;

		const opennessThreshold = opennessPercent / 100;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				if (mazeGrid[y][x] === WALL) {
					let pathNeighbors = 0;
					if (mazeGrid[y-1] && mazeGrid[y-1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y+1] && mazeGrid[y+1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y][x-1] === PATH) pathNeighbors++;
					if (mazeGrid[y][x+1] === PATH) pathNeighbors++;
					
					if (pathNeighbors > 0 && seededRandom() < opennessThreshold) {
						mazeGrid[y][x] = PATH;
					}
				}
			}
		}
		return mazeGrid;
	}

	function generateMazeRecursiveBacktracker(width, height, opennessPercent, currentMazeSeed) {
		setSeed(currentMazeSeed);
		let mazeGrid = Array(height).fill(null).map(() => Array(width).fill(WALL));

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				mazeGrid[y][x] = WALL;
			}
		}

		let currentX = Math.floor(seededRandom() * ((width - 2) / 2)) * 2 + 1;
		let currentY = Math.floor(seededRandom() * ((height - 2) / 2)) * 2 + 1;
		
		let stack = [];
		stack.push([currentX, currentY]);
		mazeGrid[currentY][currentX] = PATH;

		while (stack.length > 0) {
			let [x, y] = stack[stack.length - 1];
			let neighbors = [];

			[[x, y - 2], [x, y + 2], [x - 2, y], [x + 2, y]].forEach(([nx, ny]) => {
				if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && mazeGrid[ny][nx] === WALL) {
					neighbors.push([nx, ny]);
				}
			});

			if (neighbors.length > 0) {
				let [nextX, nextY] = neighbors[Math.floor(seededRandom() * neighbors.length)];
				mazeGrid[y + (nextY - y) / 2][x + (nextX - x) / 2] = PATH;
				mazeGrid[nextY][nextX] = PATH;
				stack.push([nextX, nextY]);
			} else {
				stack.pop();
			}
		}

		start = { x: 1, y: 1 };
		end = { x: width - 2, y: height - 2 };
		mazeGrid[start.y][start.x] = PATH;
		mazeGrid[end.y][end.x] = PATH;

		const opennessThreshold = opennessPercent / 100;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				if (mazeGrid[y][x] === WALL) {
					let pathNeighbors = 0;
					if (mazeGrid[y-1] && mazeGrid[y-1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y+1] && mazeGrid[y+1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y][x-1] === PATH) pathNeighbors++;
					if (mazeGrid[y][x+1] === PATH) pathNeighbors++;
					
					if (pathNeighbors > 0 && seededRandom() < opennessThreshold) {
						mazeGrid[y][x] = PATH;
					}
				}
			}
		}
		return mazeGrid;
	}

	function generateMazeSidewinder(width, height, opennessPercent, currentMazeSeed) {
		setSeed(currentMazeSeed);
		let mazeGrid = Array(height).fill(null).map(() => Array(width).fill(WALL));
		
		for (let x = 1; x < width - 1; x++) {
			mazeGrid[1][x] = PATH;
		}
		
		for (let y = 3; y < height - 1; y += 2) {
			let runStart = 1;
			
			for (let x = 1; x < width - 1; x += 2) {
				mazeGrid[y][x] = PATH;
				
				if (x + 2 < width - 1 && Math.random() > 0.5) {
					mazeGrid[y][x + 1] = PATH;
				} else {
					const opening = runStart + Math.floor(seededRandom() * Math.floor((x - runStart) / 2 + 1)) * 2;
					mazeGrid[y - 1][opening] = PATH;
					runStart = x + 2;
				}
			}
		}
		
		start = { x: 1, y: 1 };
		end = { x: width - 2, y: height - 2 };
		mazeGrid[start.y][start.x] = PATH;
		mazeGrid[end.y][end.x] = PATH;
		
		const opennessThreshold = opennessPercent / 100;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				if (mazeGrid[y][x] === WALL) {
					let pathNeighbors = 0;
					if (mazeGrid[y-1] && mazeGrid[y-1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y+1] && mazeGrid[y+1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y][x-1] === PATH) pathNeighbors++;
					if (mazeGrid[y][x+1] === PATH) pathNeighbors++;
					
					if (pathNeighbors > 0 && seededRandom() < opennessThreshold) {
						mazeGrid[y][x] = PATH;
					}
				}
			}
		}
		return mazeGrid;
	}

	function generateMazeEller(width, height, opennessPercent, currentMazeSeed) {
		setSeed(currentMazeSeed);
		let mazeGrid = Array(height).fill(null).map(() => Array(width).fill(WALL));
		
		let sets = {};
		let setCounter = 0;
		
		for (let y = 1; y < height - 1; y += 2) {
			let rowSets = {};
			
			for (let x = 1; x < width - 1; x += 2) {
				mazeGrid[y][x] = PATH;
				
				if (!sets[`${x},${y}`]) {
					sets[`${x},${y}`] = setCounter++;
				}
				rowSets[x] = sets[`${x},${y}`];
			}
			
			if (y < height - 3) {
				for (let x = 1; x < width - 3; x += 2) {
					if (seededRandom() > 0.5 && rowSets[x] !== rowSets[x + 2]) {
						mazeGrid[y][x + 1] = PATH;
						const oldSet = rowSets[x + 2];
						for (let key in sets) {
							if (sets[key] === oldSet) {
								sets[key] = rowSets[x];
							}
						}
					}
				}
				
				let verticalConnections = {};
				for (let x = 1; x < width - 1; x += 2) {
					if (!verticalConnections[rowSets[x]]) {
						mazeGrid[y + 1][x] = PATH;
						verticalConnections[rowSets[x]] = true;
						sets[`${x},${y + 2}`] = rowSets[x];
					} else if (seededRandom() > 0.5) {
						mazeGrid[y + 1][x] = PATH;
						sets[`${x},${y + 2}`] = rowSets[x];
					}
				}
			} else {
				for (let x = 1; x < width - 3; x += 2) {
					if (rowSets[x] !== rowSets[x + 2]) {
						mazeGrid[y][x + 1] = PATH;
						const oldSet = rowSets[x + 2];
						for (let key in sets) {
							if (sets[key] === oldSet) {
								sets[key] = rowSets[x];
							}
						}
					}
				}
			}
		}
		
		start = { x: 1, y: 1 };
		end = { x: width - 2, y: height - 2 };
		mazeGrid[start.y][start.x] = PATH;
		mazeGrid[end.y][end.x] = PATH;
		
		const opennessThreshold = opennessPercent / 100;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				if (mazeGrid[y][x] === WALL) {
					let pathNeighbors = 0;
					if (mazeGrid[y-1] && mazeGrid[y-1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y+1] && mazeGrid[y+1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y][x-1] === PATH) pathNeighbors++;
					if (mazeGrid[y][x+1] === PATH) pathNeighbors++;
					
					if (pathNeighbors > 0 && seededRandom() < opennessThreshold) {
						mazeGrid[y][x] = PATH;
					}
				}
			}
		}
		return mazeGrid;
	}

	function generateMazeWilson(width, height, opennessPercent, currentMazeSeed) {
		setSeed(currentMazeSeed);
		let mazeGrid = Array(height).fill(null).map(() => Array(width).fill(WALL));
		
		let startX = Math.floor(seededRandom() * ((width - 2) / 2)) * 2 + 1;
		let startY = Math.floor(seededRandom() * ((height - 2) / 2)) * 2 + 1;
		mazeGrid[startY][startX] = PATH;
		
		let visited = new Set();
		visited.add(`${startX},${startY}`);
		
		let unvisited = [];
		for (let y = 1; y < height - 1; y += 2) {
			for (let x = 1; x < width - 1; x += 2) {
				if (!visited.has(`${x},${y}`)) {
					unvisited.push({x, y});
				}
			}
		}
		
		while (unvisited.length > 0) {
			let index = Math.floor(seededRandom() * unvisited.length);
			let current = unvisited[index];
			let path = [current];
			
			while (!visited.has(`${current.x},${current.y}`)) {
				const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
				const dirIndex = Math.floor(seededRandom() * 4);
				const [dx, dy] = directions[dirIndex];
				
				const newX = current.x + dx;
				const newY = current.y + dy;
				
				if (newX > 0 && newX < width - 1 && newY > 0 && newY < height - 1) {
					current = {x: newX, y: newY};
					
					const loopIndex = path.findIndex(cell => cell.x === current.x && cell.y === current.y);
					if (loopIndex !== -1) {
						path = path.slice(0, loopIndex + 1);
					} else {
						path.push(current);
					}
				}
			}
			
			for (let i = 0; i < path.length - 1; i++) {
				const cell = path[i];
				const next = path[i + 1];
				
				mazeGrid[cell.y][cell.x] = PATH;
				mazeGrid[(cell.y + next.y) / 2][(cell.x + next.x) / 2] = PATH;
				
				visited.add(`${cell.x},${cell.y}`);
				unvisited = unvisited.filter(c => !(c.x === cell.x && c.y === cell.y));
			}
		}
		
		start = { x: 1, y: 1 };
		end = { x: width - 2, y: height - 2 };
		mazeGrid[start.y][start.x] = PATH;
		mazeGrid[end.y][end.x] = PATH;
		
		const opennessThreshold = opennessPercent / 100;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				if (mazeGrid[y][x] === WALL) {
					let pathNeighbors = 0;
					if (mazeGrid[y-1] && mazeGrid[y-1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y+1] && mazeGrid[y+1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y][x-1] === PATH) pathNeighbors++;
					if (mazeGrid[y][x+1] === PATH) pathNeighbors++;
					
					if (pathNeighbors > 0 && seededRandom() < opennessThreshold) {
						mazeGrid[y][x] = PATH;
					}
				}
			}
		}
		return mazeGrid;
	}
	
	function generateMazeGrowingTree(width, height, opennessPercent, currentMazeSeed) {
		setSeed(currentMazeSeed);
		let mazeGrid = Array(height).fill(null).map(() => Array(width).fill(WALL));
		
		let cells = [];
		let startX = Math.floor(seededRandom() * ((width - 2) / 2)) * 2 + 1;
		let startY = Math.floor(seededRandom() * ((height - 2) / 2)) * 2 + 1;
		cells.push({x: startX, y: startY});
		mazeGrid[startY][startX] = PATH;
		
		while (cells.length > 0) {
			let index;
			if (Math.random() > 0.5) {
				index = cells.length - 1;
			} else {
				index = Math.floor(seededRandom() * cells.length);
			}
			
			let current = cells[index];
			let neighbors = [];
			
			const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
			for (let [dx, dy] of directions) {
				const newX = current.x + dx;
				const newY = current.y + dy;
				
				if (newX > 0 && newX < width - 1 && newY > 0 && newY < height - 1 && mazeGrid[newY][newX] === WALL) {
					neighbors.push({x: newX, y: newY, dx, dy});
				}
			}
			
			if (neighbors.length > 0) {
				let next = neighbors[Math.floor(seededRandom() * neighbors.length)];
				mazeGrid[current.y + next.dy/2][current.x + next.dx/2] = PATH;
				mazeGrid[next.y][next.x] = PATH;
				cells.push({x: next.x, y: next.y});
			} else {
				cells.splice(index, 1);
			}
		}
		
		start = { x: 1, y: 1 };
		end = { x: width - 2, y: height - 2 };
		mazeGrid[start.y][start.x] = PATH;
		mazeGrid[end.y][end.x] = PATH;
		
		const opennessThreshold = opennessPercent / 100;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				if (mazeGrid[y][x] === WALL) {
					let pathNeighbors = 0;
					if (mazeGrid[y-1] && mazeGrid[y-1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y+1] && mazeGrid[y+1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y][x-1] === PATH) pathNeighbors++;
					if (mazeGrid[y][x+1] === PATH) pathNeighbors++;
					
					if (pathNeighbors > 0 && seededRandom() < opennessThreshold) {
						mazeGrid[y][x] = PATH;
					}
				}
			}
		}
		return mazeGrid;
	}
	
	function generateMazeBinaryTree(width, height, opennessPercent, currentMazeSeed) {
		setSeed(currentMazeSeed);
		let mazeGrid = Array(height).fill(null).map(() => Array(width).fill(WALL));
		
		for (let y = 1; y < height - 1; y += 2) {
			for (let x = 1; x < width - 1; x += 2) {
				mazeGrid[y][x] = PATH;
				
				let connectNorth = seededRandom() > 0.5;
				
				if (connectNorth && y > 1) {
					mazeGrid[y - 1][x] = PATH;
				} else if (x > 1) {
					mazeGrid[y][x - 1] = PATH;
				}
			}
		}
		
		start = { x: 1, y: 1 };
		end = { x: width - 2, y: height - 2 };
		mazeGrid[start.y][start.x] = PATH;
		mazeGrid[end.y][end.x] = PATH;
		
		const opennessThreshold = opennessPercent / 100;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				if (mazeGrid[y][x] === WALL) {
					let pathNeighbors = 0;
					if (mazeGrid[y-1] && mazeGrid[y-1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y+1] && mazeGrid[y+1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y][x-1] === PATH) pathNeighbors++;
					if (mazeGrid[y][x+1] === PATH) pathNeighbors++;
					
					if (pathNeighbors > 0 && seededRandom() < opennessThreshold) {
						mazeGrid[y][x] = PATH;
					}
				}
			}
		}
		return mazeGrid;
	}
	
	function generateMazeHuntAndKill(width, height, opennessPercent, currentMazeSeed) {
		setSeed(currentMazeSeed);
		let mazeGrid = Array(height).fill(null).map(() => Array(width).fill(WALL));
		
		let x = Math.floor(seededRandom() * ((width - 2) / 2)) * 2 + 1;
		let y = Math.floor(seededRandom() * ((height - 2) / 2)) * 2 + 1;
		mazeGrid[y][x] = PATH;
		
		let hunting = false;
		
		while (true) {
			if (!hunting) {
				let directions = [];
				
				if (y > 1 && mazeGrid[y - 2][x] === WALL) directions.push([0, -2]);
				if (x < width - 2 && mazeGrid[y][x + 2] === WALL) directions.push([2, 0]);
				if (y < height - 2 && mazeGrid[y + 2][x] === WALL) directions.push([0, 2]);
				if (x > 1 && mazeGrid[y][x - 2] === WALL) directions.push([-2, 0]);
				
				if (directions.length > 0) {
					const [dx, dy] = directions[Math.floor(seededRandom() * directions.length)];
					mazeGrid[y + dy/2][x + dx/2] = PATH;
					x += dx;
					y += dy;
					mazeGrid[y][x] = PATH;
				} else {
					hunting = true;
				}
			} else {
				let found = false;
				
				for (let huntY = 1; huntY < height - 1 && !found; huntY += 2) {
					for (let huntX = 1; huntX < width - 1 && !found; huntX += 2) {
						if (mazeGrid[huntY][huntX] === WALL) {
							let directions = [];
							if (huntY > 1 && mazeGrid[huntY - 2][huntX] === PATH) directions.push([0, -2]);
							if (huntX < width - 2 && mazeGrid[huntY][huntX + 2] === PATH) directions.push([2, 0]);
							if (huntY < height - 2 && mazeGrid[huntY + 2][huntX] === PATH) directions.push([0, 2]);
							if (huntX > 1 && mazeGrid[huntY][huntX - 2] === PATH) directions.push([-2, 0]);
							
							if (directions.length > 0) {
								const [dx, dy] = directions[Math.floor(seededRandom() * directions.length)];
								mazeGrid[huntY + dy/2][huntX + dx/2] = PATH;
								mazeGrid[huntY][huntX] = PATH;
								x = huntX;
								y = huntY;
								found = true;
								hunting = false;
							}
						}
					}
				}
				
				if (!found) break;
			}
		}
		
		start = { x: 1, y: 1 };
		end = { x: width - 2, y: height - 2 };
		mazeGrid[start.y][start.x] = PATH;
		mazeGrid[end.y][end.x] = PATH;
		
		const opennessThreshold = opennessPercent / 100;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				if (mazeGrid[y][x] === WALL) {
					let pathNeighbors = 0;
					if (mazeGrid[y-1] && mazeGrid[y-1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y+1] && mazeGrid[y+1][x] === PATH) pathNeighbors++;
					if (mazeGrid[y][x-1] === PATH) pathNeighbors++;
					if (mazeGrid[y][x+1] === PATH) pathNeighbors++;
					
					if (pathNeighbors > 0 && seededRandom() < opennessThreshold) {
						mazeGrid[y][x] = PATH;
					}
				}
			}
		}
		return mazeGrid;
	}

	function drawMaze() {
		if (!maze) return;
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		cellSize = canvas.width / size;

		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				if (typeof maze[y][x] === 'object') {
					if (maze[y][x].type === ONE_WAY) {
						ctx.fillStyle = '#FFA500';
					} else if (maze[y][x].type === LIMITED_PASS) {
						ctx.fillStyle = 'rgba(156, 179, 9, 0.8)';
					}
				} else {
					ctx.fillStyle = maze[y][x] === WALL ? '#363573' : '#f3f2ff';
				}
				ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

                if (typeof maze[y][x] === 'object') {
                    if (maze[y][x].type === LIMITED_PASS) {
                        ctx.fillStyle = 'white';
                        ctx.font = `${cellSize * 0.5}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(maze[y][x].passes, (x + 0.5) * cellSize, (y + 0.5) * cellSize);
                    } else if (maze[y][x].type === ONE_WAY) {
                        const arrow = directionArrows[maze[y][x].direction];
                        ctx.fillStyle = 'white';
                        ctx.font = `${cellSize * 0.6}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(arrow, (x + 0.5) * cellSize, (y + 0.5) * cellSize);
                    }
                }
			}
		}

		ctx.fillStyle = '#4CAF50';
		ctx.fillRect(start.x * cellSize, start.y * cellSize, cellSize, cellSize);
		
		ctx.fillStyle = '#F44336';
		ctx.fillRect(end.x * cellSize, end.y * cellSize, cellSize, cellSize);
	}
	
	function drawPath(path, color = 'rgba(168, 139, 121, 0.7)') {
		if (!path || path.length === 0) return;
		
		const cellCounts = {};
		for (const point of path) {
			const key = `${point.x},${point.y}`;
			cellCounts[key] = (cellCounts[key] || 0) + 1;
		}

		ctx.lineWidth = cellSize * 0.3;
		ctx.strokeStyle = color;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		
		ctx.beginPath();
		ctx.moveTo((path[0].x + 0.5) * cellSize, (path[0].y + 0.5) * cellSize);
		for (let i = 1; i < path.length; i++) {
			ctx.lineTo((path[i].x + 0.5) * cellSize, (path[i].y + 0.5) * cellSize);
		}
		ctx.stroke();

		for (let i = 1; i < path.length; i++) {
			const current = path[i];
			const prev = path[i-1];
			
			const count = Math.max(
				cellCounts[`${current.x},${current.y}`] || 0,
				cellCounts[`${prev.x},${prev.y}`] || 0
			);
			
			if (count > 1) {
				ctx.lineWidth = Math.min(cellSize * (1 - 1 / size), cellSize * (0.3 + count * 0.03));
				
				ctx.beginPath();
				ctx.strokeStyle = color;
				ctx.moveTo((prev.x + 0.5) * cellSize, (prev.y + 0.5) * cellSize);
				ctx.lineTo((current.x + 0.5) * cellSize, (current.y + 0.5) * cellSize);
				ctx.stroke();
			}
		}
	}

	function resizeMaze(newSize) {
		const oldSize = size;
		const oldMaze = maze;
		const newMaze = Array(newSize).fill(null).map(() => Array(newSize).fill(WALL));
		
		const scaleX = (newSize - 1) / (oldSize - 1);
		const scaleY = (newSize - 1) / (oldSize - 1);
		
		for (let y = 0; y < newSize; y++) {
			for (let x = 0; x < newSize; x++) {
				const oldX = Math.floor(x / scaleX);
				const oldY = Math.floor(y / scaleY);
				
				if (oldX < oldSize && oldY < oldSize) {
					if (typeof oldMaze[oldY][oldX] === 'object') {
						newMaze[y][x] = { ...oldMaze[oldY][oldX] };
					} else {
						newMaze[y][x] = oldMaze[oldY][oldX];
					}
				}
			}
		}

		start = { x: 1, y: 1 };
		end = { x: newSize - 2, y: newSize - 2 };
		
		newMaze[start.y][start.x] = PATH;
		newMaze[end.y][end.x] = PATH;
		
		maze = newMaze;
		size = newSize;
	}

	function initNewMaze() {
		const selectedAlgorithm = mazeAlgorithmSelect.value;
		if (selectedAlgorithm === 'manual') {
			const newSize = parseInt(mazeSizeSlider.value);
			
			if (maze && size !== newSize) {
				resizeMaze(newSize);
			} else {
				size = newSize;
				maze = Array(size).fill(null).map(() => Array(size).fill(WALL));
				start = { x: 1, y: 1 };
				end = { x: size - 2, y: size - 2 };
				maze[start.y][start.x] = PATH;
				maze[end.y][end.x] = PATH;
			}
			
			drawMaze();
			statusMessage.textContent = "Mode 'Dessin manuel' activé. Créez votre labyrinthe !";
			return;
		}

		size = parseInt(mazeSizeSlider.value);
		const openness = parseInt(opennessRateSlider.value);
		let currentMazeSeed = parseInt(seedInput.value);
		if (isNaN(currentMazeSeed)) {
			currentMazeSeed = Date.now();
			seedInput.value = currentMazeSeed;
		}
		setSeed(currentMazeSeed);
		switch (selectedAlgorithm) {
			case 'dfs':
				maze = generateMazeDFS(size, size, openness, currentMazeSeed);
				break;
			case 'prim':
				maze = generateMazePrim(size, size, openness, currentMazeSeed);
				break;
			case 'kruskal':
				maze = generateMazeKruskal(size, size, openness, currentMazeSeed);
				break;
			case 'recursiveBacktracker':
				maze = generateMazeRecursiveBacktracker(size, size, openness, currentMazeSeed);
				break;
			case 'sidewinder':
				maze = generateMazeSidewinder(size, size, openness, currentMazeSeed);
				break;
			case 'eller':
				maze = generateMazeEller(size, size, openness, currentMazeSeed);
				break;
			case 'aldousBroder':
				maze = generateMazeAldousBroder(size, size, openness, currentMazeSeed);
				break;
			case 'wilson':
				maze = generateMazeWilson(size, size, openness, currentMazeSeed);
				break;
			case 'growingTree':
				maze = generateMazeGrowingTree(size, size, openness, currentMazeSeed);
				break;
			case 'binaryTree':
				maze = generateMazeBinaryTree(size, size, openness, currentMazeSeed);
				break;
			case 'huntAndKill':
				maze = generateMazeHuntAndKill(size, size, openness, currentMazeSeed);
				break;
			default:
				maze = generateMazeDFS(size, size, openness, currentMazeSeed);
		}
		
		drawMaze();
		statusMessage.textContent = ""; 
	}

	generateBtn.addEventListener('click', () => {
		const selectedAlgorithm = mazeAlgorithmSelect.value;
		if (selectedAlgorithm === 'manual') {
			const { pathFound, shortestPath } = hasValidPath(maze, start, end);
			if (pathFound) {
				drawMaze();
				drawPath(shortestPath, 'rgba(76, 175, 80, 0.7)');
				statusMessage.textContent = "Labyrinthe valide ! Un chemin existe.";
				solveBtn.disabled = false;
				solveBtn.textContent = "Résoudre";
			} else {
				statusMessage.textContent = "Attention : Aucun chemin n'existe entre le début et la fin.";
				solveBtn.disabled = true;
				solveBtn.textContent = "Résoudre";
			}
		} else {
			initNewMaze();
			solveBtn.disabled = false;
		}
	});

	drawWallBtn.addEventListener('click', () => {
		drawingMode = 'wall';
		drawWallBtn.classList.replace('btn-secondary', 'btn-primary');
		eraseWallBtn.classList.replace('btn-primary', 'btn-secondary');
		drawLimitedBtn.classList.replace('btn-primary', 'btn-secondary');
		drawOneWayBtn.classList.replace('btn-primary', 'btn-secondary');
		statusMessage.textContent = "Mode : Dessiner un mur";
	});

	drawOneWayBtn.addEventListener('click', () => {
		drawingMode = 'one_way';
		drawOneWayBtn.classList.replace('btn-secondary', 'btn-primary');
		eraseWallBtn.classList.replace('btn-primary', 'btn-secondary');
		drawWallBtn.classList.replace('btn-primary', 'btn-secondary');
		drawLimitedBtn.classList.replace('btn-primary', 'btn-secondary');
		statusMessage.textContent = "Mode : Dessiner un passage à sens unique";
	});

	drawLimitedBtn.addEventListener('click', () => {
		drawingMode = 'limited';
		drawLimitedBtn.classList.replace('btn-secondary', 'btn-primary');
		eraseWallBtn.classList.replace('btn-primary', 'btn-secondary');
		drawWallBtn.classList.replace('btn-primary', 'btn-secondary');
		drawOneWayBtn.classList.replace('btn-primary', 'btn-secondary');
		statusMessage.textContent = "Mode : Dessiner un passage limité";
	});

	eraseWallBtn.addEventListener('click', () => {
		drawingMode = 'path';
		drawWallBtn.classList.replace('btn-primary', 'btn-secondary');
		eraseWallBtn.classList.replace('btn-secondary', 'btn-primary');
		drawLimitedBtn.classList.replace('btn-primary', 'btn-secondary');
		drawOneWayBtn.classList.replace('btn-primary', 'btn-secondary');
		statusMessage.textContent = "Mode : Effacer un mur";
	});

	clearMazeBtn.addEventListener('click', () => {
		if (mazeAlgorithmSelect.value === 'manual') {
			maze = Array(size).fill(null).map(() => Array(size).fill(PATH));
			maze[start.y][start.x] = PATH;
			maze[end.y][end.x] = PATH;
			drawMaze();
			statusMessage.textContent = "Canevas effacé.";
		}
	});

	function getCellCoordinates(event) {
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const x = Math.floor(((event.clientX - rect.left) * scaleX) / cellSize);
		const y = Math.floor(((event.clientY - rect.top) * scaleY) / cellSize);
		return { x, y };
	}

	canvas.addEventListener('mousedown', (e) => {
		if (mazeAlgorithmSelect.value === 'manual' && drawingMode) {
			isDrawing = true;
			const { x, y } = getCellCoordinates(e);
			if (x >= 0 && x < size && y >= 0 && y < size) {
				if ((x === start.x && y === start.y) || (x === end.x && y === end.y)) return;
				
				if (drawingMode === 'wall') {
					maze[y][x] = WALL;
				} else if (drawingMode === 'path') {
					maze[y][x] = PATH;
				} else if (drawingMode === 'one_way') {
					maze[y][x] = { type: ONE_WAY, direction: 'north' };
				} else if (drawingMode === 'limited') {
					maze[y][x] = { type: LIMITED_PASS, passes: 1 };
				}
				drawMaze();
			}
		}
	});

	canvas.addEventListener('wheel', (e) => {
        if (mazeAlgorithmSelect.value === 'manual') {
            const { x, y } = getCellCoordinates(e);

            if (x < 0 || x >= size || y < 0 || y >= size || typeof maze[y][x] !== 'object') {
                return;
            }

            e.preventDefault();

            const cell = maze[y][x];

            if (cell.type === LIMITED_PASS) {
                const delta = e.deltaY > 0 ? -1 : 1;
                cell.passes = Math.max(1, cell.passes + delta);
            } else if (cell.type === ONE_WAY) {
                const currentIndex = directions.indexOf(cell.direction);
                const delta = e.deltaY > 0 ? 1 : -1;
                const nextIndex = (currentIndex + delta + directions.length) % directions.length;
                cell.direction = directions[nextIndex];
            }
            
            drawMaze();
        }
    });

	canvas.addEventListener('mouseup', () => {
		isDrawing = false;
	});

	canvas.addEventListener('mouseleave', () => {
		isDrawing = false;
	});

	solveBtn.addEventListener('click', async () => {
		if (!maze) {
			const messageBox = document.createElement('div');
			messageBox.style.cssText = `
				position: fixed;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				background-color: white;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 4px 8px rgba(0,0,0,0.1);
				z-index: 1000;
				text-align: center;
				border: 1px solid #DCD6D1;
			`;
			messageBox.innerHTML = `
				<p class="text-gray-800 text-lg mb-4">Veuillez d'abord générer un labyrinthe.</p>
				<button class="btn-primary py-2 px-4 rounded-lg" onclick="this.parentNode.remove()">OK</button>
			`;
			document.body.appendChild(messageBox);
			return;
		}
		if (isSolving) return;

		isSolving = true;
		solveBtn.disabled = true;
		generateBtn.disabled = true;
		solveBtn.textContent = "Résolution en cours...";
		solveBtn.classList.replace('btn-primary', 'btn-secondary');
		statusMessage.textContent = "Initialisation de l'algorithme...";
		
		const animSpeedConst = parseInt(animSpeedSlider.value);
		
		await new Promise(resolve => setTimeout(resolve, animSpeedConst));

		const populationSize = parseInt(populationSizeSlider.value);
		const numGenerations = parseInt(generationsSlider.value);
		const mutationRate = parseInt(mutationRateSlider.value) / 100;
		const tournamentSize = parseInt(tournamentSizeSlider.value);
		const elitismRate = parseInt(elitismRateSlider.value) / 100;
		const pathLengthMultiplier = parseInt(pathLengthMultiplierSlider.value);
		const pathLength = size * size * pathLengthMultiplier;
		const crossoverRate = parseInt(crossoverRateSlider.value) / 100;
		const crossoverType = crossoverTypeSelect.value;
		const mutationType = mutationTypeSelect.value;
		const diversityPressure = parseInt(diversityPressureSlider.value) / 100;
		const selectionPressure = parseFloat(selectionPressureSlider.value);
		const distanceWeight = parseFloat(distanceWeightSlider.value);
		const pathLengthWeight = parseFloat(pathLengthWeightSlider.value);
		const turnsWeight = parseFloat(turnsWeightSlider.value);
		const progressWeight = parseFloat(progressWeightSlider.value);
		const collisionPenalty = parseFloat(collisionPenaltySlider.value);

		let population = [];
		const fitnessHistory = [];

		function createIndividual() {
			const moves = ['N', 'E', 'S', 'W'];
			let chromosome = [];
			for (let i = 0; i < pathLength; i++) {
				chromosome.push(moves[Math.floor(Math.random() * 4)]);
			}
			return { chromosome: chromosome, fitness: 0 };
		}

		for (let i = 0; i < populationSize; i++) {
			population.push(createIndividual());
		}

		function calculateFitness(individual) {
			let pos = { ...start };
			let path = [{...start}];
			let score = 0;
			let visited = new Set([`${pos.x},${pos.y}`]);
			let lastDirection = null;
			let turnCount = 0;
			let progressMade = 0;
			let maxDistance = Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
			
			const passesRemaining = {};
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					if (typeof maze[y][x] === 'object' && maze[y][x].type === LIMITED_PASS) {
						passesRemaining[`${x},${y}`] = maze[y][x].passes;
					}
				}
			}

			for (const move of individual.chromosome) {
				let nextPos = { ...pos };
				if (move === 'N') nextPos.y--;
				else if (move === 'E') nextPos.x++;
				else if (move === 'S') nextPos.y++;
				else if (move === 'W') nextPos.x--;

				if (nextPos.x < 0 || nextPos.x >= size || nextPos.y < 0 || nextPos.y >= size) {
					score += collisionPenalty;
					continue;
				}

				const cell = maze[nextPos.y][nextPos.x];
				let canMove = true;

				if (cell === WALL) {
					score += collisionPenalty;
					continue;
				}

				if (typeof cell === 'object' && cell.type === ONE_WAY) {
					const direction = cell.direction;
					const moveDirection = 
						move === 'S' ? 'north' :
						move === 'N' ? 'south' :
						move === 'W' ? 'east' :
						'west';
						
					if (moveDirection !== direction) {
						score += collisionPenalty;
						continue;
					}
				}

				if (typeof cell === 'object' && cell.type === LIMITED_PASS) {
					const key = `${nextPos.x},${nextPos.y}`;
					if (passesRemaining[key] <= 0) {
						score += collisionPenalty;
						continue;
					} else {
						passesRemaining[key]--;
					}
				}

				pos = nextPos;
				path.push({...pos});
				
				if (!visited.has(`${pos.x},${pos.y}`)) {
					score += progressWeight;
					visited.add(`${pos.x},${pos.y}`);
				} else {
					score += pathLengthWeight;
				}
				
				if (lastDirection && lastDirection !== move) {
					score += turnsWeight;
					turnCount++;
				}
				lastDirection = move;
				
				const currentDistance = Math.abs(pos.x - end.x) + Math.abs(pos.y - end.y);
				const progress = (maxDistance - currentDistance) / maxDistance;
				progressMade += progress;
				
				if (pos.x === end.x && pos.y === end.y) {
					score += 10000 + pathLengthWeight * path.length;
					break;
				}
			}
			
			const distToEnd = Math.abs(pos.x - end.x) + Math.abs(pos.y - end.y);
			score += distanceWeight * (maxDistance - distToEnd);
			score += progressMade * progressWeight;
			
			individual.fitness = score;
			return path;
		}

		function tournamentSelection(pop, tournamentSizeParam, pressure) {
			const currentTournamentSize = tournamentSizeParam;
			let competitors = [];
			
			for (let i = 0; i < currentTournamentSize; i++) {
				competitors.push(pop[Math.floor(Math.random() * pop.length)]);
			}
			
			competitors.sort((a, b) => b.fitness - a.fitness);
			
			for (let i = 0; i < competitors.length; i++) {
				if (Math.random() < Math.pow(i / competitors.length, pressure)) {
					return competitors[i];
				}
			}
			
			return competitors[0];
		}

		function crossover(parent1, parent2) {
			const crossoverType = crossoverTypeSelect.value;
			
			if (crossoverType === 'singlePoint') {
				const crossoverPoint = Math.floor(Math.random() * parent1.chromosome.length);
				const child1Chromosome = parent1.chromosome.slice(0, crossoverPoint).concat(parent2.chromosome.slice(crossoverPoint));
				const child2Chromosome = parent2.chromosome.slice(0, crossoverPoint).concat(parent1.chromosome.slice(crossoverPoint));
				return [
					{ chromosome: child1Chromosome, fitness: 0 },
					{ chromosome: child2Chromosome, fitness: 0 }
				];
			} else if (crossoverType === 'twoPoint') {
				const point1 = Math.floor(Math.random() * parent1.chromosome.length);
				const point2 = Math.floor(Math.random() * parent1.chromosome.length);
				const start = Math.min(point1, point2);
				const end = Math.max(point1, point2);
				
				const child1Chromosome = [
					...parent1.chromosome.slice(0, start),
					...parent2.chromosome.slice(start, end),
					...parent1.chromosome.slice(end)
				];
				
				const child2Chromosome = [
					...parent2.chromosome.slice(0, start),
					...parent1.chromosome.slice(start, end),
					...parent2.chromosome.slice(end)
				];
				
				return [
					{ chromosome: child1Chromosome, fitness: 0 },
					{ chromosome: child2Chromosome, fitness: 0 }
				];
			} else if (crossoverType === 'uniform') {
				const child1Chromosome = [];
				const child2Chromosome = [];
				
				for (let i = 0; i < parent1.chromosome.length; i++) {
					if (Math.random() < 0.5) {
						child1Chromosome.push(parent1.chromosome[i]);
						child2Chromosome.push(parent2.chromosome[i]);
					} else {
						child1Chromosome.push(parent2.chromosome[i]);
						child2Chromosome.push(parent1.chromosome[i]);
					}
				}
				
				return [
					{ chromosome: child1Chromosome, fitness: 0 },
					{ chromosome: child2Chromosome, fitness: 0 }
				];
			}
		}

		function mutate(individual) {
			const mutationType = mutationTypeSelect.value;
			const moves = ['N', 'E', 'S', 'W'];
			
			if (mutationType === 'swap') {
				for (let i = 0; i < individual.chromosome.length; i++) {
					if (Math.random() < mutationRate) {
						const swapIndex = Math.floor(Math.random() * individual.chromosome.length);
						const temp = individual.chromosome[i];
						individual.chromosome[i] = individual.chromosome[swapIndex];
						individual.chromosome[swapIndex] = temp;
					}
				}
			} else if (mutationType === 'inversion') {
				if (Math.random() < mutationRate) {
					const start = Math.floor(Math.random() * individual.chromosome.length);
					const end = Math.floor(Math.random() * (individual.chromosome.length - start)) + start;
					individual.chromosome = [
						...individual.chromosome.slice(0, start),
						...individual.chromosome.slice(start, end + 1).reverse(),
						...individual.chromosome.slice(end + 1)
					];
				}
			} else if (mutationType === 'scramble') {
				if (Math.random() < mutationRate) {
					const start = Math.floor(Math.random() * individual.chromosome.length);
					const end = Math.floor(Math.random() * (individual.chromosome.length - start)) + start;
					const segment = individual.chromosome.slice(start, end + 1);
					
					for (let i = segment.length - 1; i > 0; i--) {
						const j = Math.floor(Math.random() * (i + 1));
						[segment[i], segment[j]] = [segment[j], segment[i]];
					}
					
					individual.chromosome = [
						...individual.chromosome.slice(0, start),
						...segment,
						...individual.chromosome.slice(end + 1)
					];
				}
			}
			
			for (let i = 0; i < individual.chromosome.length; i++) {
				if (Math.random() < mutationRate) {
					individual.chromosome[i] = moves[Math.floor(Math.random() * 4)];
				}
			}
		}

		function crossover(parent1, parent2) {
			const crossoverPoint = Math.floor(Math.random() * parent1.chromosome.length);
			const child1Chromosome = parent1.chromosome.slice(0, crossoverPoint).concat(parent2.chromosome.slice(crossoverPoint));
			const child2Chromosome = parent2.chromosome.slice(0, crossoverPoint).concat(parent1.chromosome.slice(crossoverPoint));
			return [
				{ chromosome: child1Chromosome, fitness: 0 },
				{ chromosome: child2Chromosome, fitness: 0 }
			];
		}

		function mutate(individual) {
			const moves = ['N', 'E', 'S', 'W'];
			for (let i = 0; i < individual.chromosome.length; i++) {
				if (Math.random() < mutationRate) {
					individual.chromosome[i] = moves[Math.floor(Math.random() * 4)];
				}
			}
		}
		
		let bestIndividualOfAllTime = null;

		for (let gen = 0; gen < numGenerations; gen++) {
			population.forEach(ind => calculateFitness(ind));
			population.sort((a, b) => b.fitness - a.fitness);
			
			let bestOfGen = population[0];
			if (bestIndividualOfAllTime === null || bestOfGen.fitness > bestIndividualOfAllTime.fitness) {
				bestIndividualOfAllTime = JSON.parse(JSON.stringify(bestOfGen));
			}

			fitnessHistory.push(bestIndividualOfAllTime.fitness);

			let newPopulation = [];
			
			const elitismCount = Math.floor(populationSize * elitismRate);
			for(let i = 0; i < elitismCount; i++) {
				newPopulation.push(population[i]);
			}

			while (newPopulation.length < populationSize) {
				if (Math.random() < crossoverRate) {
				const parent1 = tournamentSelection(population, tournamentSize, selectionPressure);
				const parent2 = tournamentSelection(population, tournamentSize, selectionPressure);
				let [child1, child2] = crossover(parent1, parent2);
				mutate(child1);
				mutate(child2);
				newPopulation.push(child1);
				if (newPopulation.length < populationSize) {
					newPopulation.push(child2);
				}
				} else {
				const individual = tournamentSelection(population, tournamentSize, selectionPressure);
				newPopulation.push({...individual});
				}
				
				if (Math.random() < diversityPressure) {
				const randomIndex = Math.floor(Math.random() * newPopulation.length);
				newPopulation[randomIndex] = createIndividual();
				}
			}
			population = newPopulation;
			
			statusMessage.textContent = `Génération ${gen + 1} / ${numGenerations} - Meilleure Fitness: ${Math.round(bestIndividualOfAllTime.fitness)}`;

			if (gen % 5 === 0 || gen === numGenerations - 1) {
				drawMaze();
				const bestPath = calculateFitness(bestIndividualOfAllTime);
				drawPath(bestPath);
			await new Promise(resolve => setTimeout(resolve, parseInt(animSpeedSlider.value)));
			}
		}

		drawMaze();
		const finalPath = calculateFitness(bestIndividualOfAllTime);
		drawPath(finalPath, 'rgba(179, 54, 156, 0.7)');
		
		let solutionFound = false;
		const lastPoint = finalPath[finalPath.length - 1];
		if (lastPoint.x === end.x && lastPoint.y === end.y) {
			solutionFound = true;
		}

		statusMessage.textContent = solutionFound ? `Une solution a été trouvée en ${numGenerations} générations` : `Optimisation terminée. La meilleure solution trouvée est affichée.`;
		
		if (!solutionFound) {
			statusMessage.textContent += " La solution n'a pas atteint la sortie. Essayez d'augmenter la 'Longueur Max. du Chemin (Multiplicateur)' ou le nombre de 'Générations'.";
		}

		isSolving = false;
		solveBtn.disabled = false;
		generateBtn.disabled = false;
		solveBtn.textContent = "Résoudre";
		solveBtn.classList.replace('btn-secondary', 'btn-primary');
	});

	const algorithms = ['dfs', 'prim', 'kruskal', 'recursiveBacktracker', 'sidewinder', 'eller', 'wilson', 'growingTree', 'binaryTree', 'huntAndKill'];

	const randomAlgo = algorithms[Math.floor(Math.random() * algorithms.length)];
	mazeAlgorithmSelect.value = randomAlgo;
	mazeAlgorithmSelect.dispatchEvent(new Event('change'));

	window.addEventListener('resize', drawMaze);
	initNewMaze();
	solveBtn.disabled = false;
	updateMazeSizeInfo();
});