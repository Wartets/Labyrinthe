# app.py

from flask import Flask, jsonify, request, send_from_directory
import random
import json
import os
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')

# ----------------------------
# Paramètres par défaut
# ----------------------------
DEFAULT_ROWS = 31          # Doivent être impairs pour la génération DFS par "sauts de 2"
DEFAULT_COLS = 41
DEFAULT_SEED = None

# GA — paramètres par défaut
GA_POP_SIZE = 150
GA_GENS = 150
GA_MAX_STEPS = 800         # longueur du chromosome = nombre max de mouvements
GA_MUT_RATE = 0.03
GA_TOURNAMENT_K = 3
GA_ELITISM = 2             # nombre d’élites conservés à chaque génération
GA_HISTORY = True          # renvoyer l’historique du meilleur par génération

# ----------------------------
# Stockage "en mémoire" pour une session simple
# ----------------------------
STATE = {
    "maze": None,          # grille 2D mur/chemin
    "rows": None,
    "cols": None,
    "start": None,         # (r, c)
    "goal": None           # (r, c)
}

# ----------------------------
# Outils : Labyrinthe
# ----------------------------

def ensure_odd(n):
    return n if n % 2 == 1 else (n + 1)

def in_bounds(r, c, rows, cols):
    return 0 <= r < rows and 0 <= c < cols

def generate_maze(rows=DEFAULT_ROWS, cols=DEFAULT_COLS, seed=None):
    """Génère un labyrinthe parfait en grille binaire (0=mur, 1=chemin) avec DFS 'saut de 2'."""
    if seed is not None:
        random.seed(seed)
    rows = ensure_odd(rows)
    cols = ensure_odd(cols)

    # Initialisation : murs partout
    grid = [[0 for _ in range(cols)] for _ in range(rows)]

    # On travaille sur les cellules impaires (1..rows-2, 1..cols-2)
    def neighbors_two_steps(r, c):
        for dr, dc in [(-2,0),(2,0),(0,-2),(0,2)]:
            nr, nc = r + dr, c + dc
            if in_bounds(nr, nc, rows, cols) and grid[nr][nc] == 0:
                yield nr, nc, dr, dc

    # Choisir un point de départ impair
    start_r, start_c = 1, 1
    grid[start_r][start_c] = 1

    stack = [(start_r, start_c)]
    while stack:
        r, c = stack[-1]
        # voisins non visités à 2 cases
        neigh = [(nr, nc, dr, dc) for nr, nc, dr, dc in neighbors_two_steps(r, c) if grid[nr][nc] == 0]
        if neigh:
            nr, nc, dr, dc = random.choice(neigh)
            # ouvrir le mur entre (r,c) et (nr,nc)
            grid[r + dr//2][c + dc//2] = 1
            grid[nr][nc] = 1
            stack.append((nr, nc))
        else:
            stack.pop()

    start = (1, 1)
    goal = (rows - 2, cols - 2)

    # Marquer départ/arrivée (facultatif côté grille — front-end utilise start/goal)
    # grid[start[0]][start[1]] = 1
    # grid[goal[0]][goal[1]] = 1

    return grid, start, goal, rows, cols

# ----------------------------
# Outils : GA
# ----------------------------

# Directions : 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
DIRS = [(-1,0),(0,1),(1,0),(0,-1)]

def simulate_path(grid, start, goal, genes, record_trace=False):
    """
    Simule un chromosome (séquence de mouvements) sur la grille.
    Reste en place si collision (compte pénalité).
    Si record_trace=True, enregistre un pas-à-pas:
      { i, move, ok, pos:[r,c], dist, coll }
    """
    rows, cols = len(grid), len(grid[0])
    r, c = start
    positions = [(r, c)]
    collisions = 0
    steps_to_goal = None
    reached = False
    trace = [] if record_trace else None

    for i, g in enumerate(genes):
        dr, dc = DIRS[g]
        nr, nc = r + dr, c + dc
        ok = in_bounds(nr, nc, rows, cols) and grid[nr][nc] == 1

        if ok:
            r, c = nr, nc
        else:
            collisions += 1  # on reste en place

        positions.append((r, c))

        if record_trace:
            # distance de Manhattan après l'action
            d = manhattan((r, c), goal)
            trace.append({
                "i": int(i),
                "move": int(g),          # 0=UP 1=RIGHT 2=DOWN 3=LEFT
                "ok": bool(ok),
                "pos": [int(r), int(c)], # JSON-friendly
                "dist": int(d),
                "coll": (not ok)
            })

        if (r, c) == goal and not reached:
            reached = True
            steps_to_goal = i + 1
            break  # on s'arrête à la première arrivée

    return {
        "positions": positions,
        "reached": reached,
        "steps_to_goal": steps_to_goal,
        "collisions": collisions,
        "final_pos": (r, c),
        "trace": trace
    }

def manhattan(a, b):
    return abs(a[0]-b[0]) + abs(a[1]-b[1])

def fitness_function(sim, goal, max_steps):
    """
    Fitness à maximiser.
    Combine :
      + Proximité de l'arrivée (distance Manhattan)
      + Pénalité collisions
      + Bonus si arrivée atteinte, plus tôt = mieux
    """
    dist = manhattan(sim["final_pos"], goal)
    # Base sur distance (plus petit = mieux) -> convertir en score
    score = 1.0 / (1.0 + dist)

    # Pénalité collisions
    score -= 0.01 * sim["collisions"]

    # Bonus si arrivé
    if sim["reached"]:
        # gros bonus + plus tôt = plus grand
        score += 1.0 + (1.0 / (1.0 + sim["steps_to_goal"]))

    # limiter pour éviter valeurs négatives extrêmes
    return max(score, -1.0)

def random_individual(max_steps):
    return [random.randint(0, 3) for _ in range(max_steps)]

def mutate(genes, rate):
    for i in range(len(genes)):
        if random.random() < rate:
            # soit changer la direction aléatoirement (différente)
            old = genes[i]
            genes[i] = random.randint(0, 3)
            # s'assurer qu'il y a un peu de variation :
            if genes[i] == old:
                genes[i] = (old + random.randint(1,3)) % 4
    return genes

def crossover(parent_a, parent_b):
    if len(parent_a) != len(parent_b):
        raise ValueError("Parents de tailles différentes")
    n = len(parent_a)
    if n < 2:
        return parent_a[:], parent_b[:]
    cut = random.randint(1, n-1)  # one-point
    child1 = parent_a[:cut] + parent_b[cut:]
    child2 = parent_b[:cut] + parent_a[cut:]
    return child1, child2

def tournament_selection(pop, fitnesses, k=GA_TOURNAMENT_K):
    """Retourne l'index du vainqueur d'un tournoi à k individus."""
    contenders = random.sample(range(len(pop)), k)
    best_idx = max(contenders, key=lambda idx: fitnesses[idx])
    return best_idx

def run_ga(grid, start, goal,
           pop_size=GA_POP_SIZE,
           generations=GA_GENS,
           max_steps=GA_MAX_STEPS,
           mut_rate=GA_MUT_RATE,
           elitism=GA_ELITISM,
           history=GA_HISTORY,
           seed=None):

    if seed is not None:
        random.seed(seed)

    # Population initiale
    population = [random_individual(max_steps) for _ in range(pop_size)]

    best_overall = None
    best_overall_fit = float('-inf')
    history_best = []  # pour animation côté front

    for gen in range(generations):
        sims = [simulate_path(grid, start, goal, indiv, record_trace=False) for indiv in population]
        fits = [fitness_function(sim, goal, max_steps) for sim in sims]

        # Meilleur de la génération (re-simulé avec trace pour animation)
        gen_best_idx = max(range(pop_size), key=lambda i: fits[i])
        gen_best_indiv = population[gen_best_idx][:]
        gen_best_sim = simulate_path(grid, start, goal, gen_best_indiv, record_trace=True)
        gen_best_fit = fitness_function(gen_best_sim, goal, max_steps)

        if gen_best_fit > best_overall_fit:
            best_overall_fit = gen_best_fit
            best_overall = {
                "genes": gen_best_indiv[:],
                "sim": gen_best_sim
            }

        if history:
            history_best.append({
                "generation": gen,
                "fitness": gen_best_fit,
                "positions": gen_best_sim["positions"],
                "reached": gen_best_sim["reached"],
                "steps_to_goal": gen_best_sim["steps_to_goal"]
            })

        # Arrêt précoce si l'objectif est atteint
        if gen_best_sim["reached"]:
            break

        # Nouvelle population avec élitisme
        new_population = []

        # Conserver les meilleurs "elitism"
        elite_indices = sorted(range(pop_size), key=lambda i: fits[i], reverse=True)[:elitism]
        for ei in elite_indices:
            new_population.append(population[ei][:])

        # Reproduction via tournoi + crossover + mutation
        while len(new_population) < pop_size:
            i1 = tournament_selection(population, fits)
            i2 = tournament_selection(population, fits)
            p1, p2 = population[i1], population[i2]
            c1, c2 = crossover(p1, p2)
            new_population.append(mutate(c1, mut_rate))
            if len(new_population) < pop_size:
                new_population.append(mutate(c2, mut_rate))

        population = new_population

    # recalcul pour le meilleur overall (sécurité)
    best_sim = simulate_path(grid, start, goal, best_overall["genes"], record_trace=True)
    best_overall["sim"] = best_sim

    return {
        "best_genes": best_overall["genes"],
        "best_positions": best_overall["sim"]["positions"],
        "best_reached": best_overall["sim"]["reached"],
        "best_steps_to_goal": best_overall["sim"]["steps_to_goal"],
        "best_fitness": fitness_function(best_overall["sim"], goal, max_steps),
        "best_trace": best_overall["sim"]["trace"],
        "history": history_best
    }

# ----------------------------
# API
# ----------------------------

@app.route('/')
def root():
    return send_from_directory('.', 'index.html')

@app.route('/style.css')
def css():
    return send_from_directory('.', 'style.css')

@app.route('/script.js')
def js():
    return send_from_directory('.', 'script.js')

@app.route('/api/generate', methods=['GET'])
def api_generate():
    rows = int(request.args.get('rows', DEFAULT_ROWS))
    cols = int(request.args.get('cols', DEFAULT_COLS))
    seed = request.args.get('seed', DEFAULT_SEED)
    seed = int(seed) if (seed not in (None, '', 'None')) else None

    grid, start, goal, R, C = generate_maze(rows, cols, seed)

    STATE["maze"] = grid
    STATE["rows"] = R
    STATE["cols"] = C
    STATE["start"] = start
    STATE["goal"] = goal

    return jsonify({
        "rows": R,
        "cols": C,
        "grid": grid,
        "start": start,
        "goal": goal,
        "seed": seed
    })

@app.route('/api/maze', methods=['GET'])
def api_maze():
    if STATE["maze"] is None:
        # Auto-générer si rien n'existe
        grid, start, goal, R, C = generate_maze(DEFAULT_ROWS, DEFAULT_COLS, DEFAULT_SEED)
        STATE.update({"maze": grid, "rows": R, "cols": C, "start": start, "goal": goal})
    return jsonify({
        "rows": STATE["rows"],
        "cols": STATE["cols"],
        "grid": STATE["maze"],
        "start": STATE["start"],
        "goal": STATE["goal"]
    })

@app.route('/api/solve', methods=['POST'])
def api_solve():
    global GA_TOURNAMENT_K
    if STATE["maze"] is None:
        return jsonify({"error": "Aucun labyrinthe. Appelez /api/generate d'abord."}), 400

    data = request.get_json(silent=True) or {}
    pop_size = int(data.get("pop_size", GA_POP_SIZE))
    generations = int(data.get("generations", GA_GENS))
    max_steps = int(data.get("max_steps", GA_MAX_STEPS))
    mut_rate = float(data.get("mut_rate", GA_MUT_RATE))
    elitism = int(data.get("elitism", GA_ELITISM))
    tournament_k = int(data.get("tournament_k", GA_TOURNAMENT_K))
    history = bool(data.get("history", GA_HISTORY))
    seed = data.get("seed", None)
    seed = int(seed) if (seed not in (None, '', 'None')) else None

    # paramètres globaux modifiables
    GA_TOURNAMENT_K = tournament_k

    res = run_ga(
        grid=STATE["maze"],
        start=STATE["start"],
        goal=STATE["goal"],
        pop_size=pop_size,
        generations=generations,
        max_steps=max_steps,
        mut_rate=mut_rate,
        elitism=elitism,
        history=history,
        seed=seed
    )

    return jsonify({
        "best_positions": res["best_positions"],
        "best_reached": res["best_reached"],
        "best_steps_to_goal": res["best_steps_to_goal"],
        "best_fitness": res["best_fitness"],
        "best_trace": res["best_trace"],
        "history": res["history"]
    })

if __name__ == '__main__':
    # Permet de servir les fichiers à partir du dossier courant.
    app.run(host='127.0.0.1', port=5000, debug=True)
