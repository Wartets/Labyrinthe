from flask import Flask, jsonify, request, send_from_directory, Response
import random
import json
import os
from datetime import datetime
import time

app = Flask(__name__, static_folder='.', static_url_path='')

DEFAULT_ROWS = 17
DEFAULT_COLS = 21
DEFAULT_SEED = None

GA_POP_SIZE = 20
GA_GENS = 1000
GA_MAX_STEPS = 1000
GA_MUT_RATE = 0.03
GA_TOURNAMENT_K = 3
GA_ELITISM = 2
GA_HISTORY = True

STATE = {
    "maze": None,
    "rows": None,
    "cols": None,
    "start": None,
    "goal": None
}

def ensure_odd(n):
    return n if n % 2 == 1 else (n + 1)

def in_bounds(r, c, rows, cols):
    return 0 <= r < rows and 0 <= c < cols

def generate_maze(rows=DEFAULT_ROWS, cols=DEFAULT_COLS, seed=None, openness=0.0, closeness=0.0):
    if seed is not None:
        random.seed(seed)
    rows = ensure_odd(rows)
    cols = ensure_odd(cols)

    grid = [[0 for _ in range(cols)] for _ in range(rows)]

    def neighbors_two_steps(r, c):
        for dr, dc in [(-2,0),(2,0),(0,-2),(0,2)]:
            nr, nc = r + dr, c + dc
            if in_bounds(nr, nc, rows, cols) and grid[nr][nc] == 0:
                yield nr, nc, dr, dc

    start_r, start_c = 1, 1
    grid[start_r][start_c] = 1

    stack = [(start_r, start_c)]
    while stack:
        r, c = stack[-1]
        neigh = [(nr, nc, dr, dc) for nr, nc, dr, dc in neighbors_two_steps(r, c) if grid[nr][nc] == 0]
        if neigh:
            nr, nc, dr, dc = random.choice(neigh)
            grid[r + dr//2][c + dc//2] = 1
            grid[nr][nc] = 1
            stack.append((nr, nc))
        else:
            stack.pop()

    if openness > 0.0:
        for r in range(1, rows - 1):
            for c in range(1, cols - 1):
                if grid[r][c] == 0 and random.random() < openness:
                    grid[r][c] = 1

    start = (1, 1)
    goal = (rows - 2, cols - 2)

    if closeness > 0.0:
        for r in range(1, rows - 1):
            for c in range(1, cols - 1):
                if (r, c) != start and (r, c) != goal and grid[r][c] == 1 and random.random() < closeness:
                    grid[r][c] = 0

    return grid, start, goal, rows, cols

DIRS = [(-1,0),(0,1),(1,0),(0,-1)]

def simulate_path(grid, start, goal, genes, record_trace=False):
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
            collisions += 1

        positions.append((r, c))

        if record_trace:
            d = manhattan((r, c), goal)
            trace.append({
                "i": int(i),
                "move": int(g),
                "ok": bool(ok),
                "pos": [int(r), int(c)],
                "dist": int(d),
                "coll": (not ok)
            })

        if (r, c) == goal and not reached:
            reached = True
            steps_to_goal = i + 1

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
    dist = manhattan(sim["final_pos"], goal)
    score = 1.0 / (1.0 + dist)

    score -= 0.01 * sim["collisions"]

    if sim["reached"]:
        score += 1.0 + (1.0 / (1.0 + sim["steps_to_goal"]))

    return max(score, -1.0)

def random_individual(max_steps):
    return [random.randint(0, 3) for _ in range(max_steps)]

def mutate(genes, rate):
    for i in range(len(genes)):
        if random.random() < rate:
            old = genes[i]
            genes[i] = random.randint(0, 3)
            if genes[i] == old:
                genes[i] = (old + random.randint(1,3)) % 4
    return genes

def crossover(parent_a, parent_b):
    if len(parent_a) != len(parent_b):
        raise ValueError("Parents de tailles différentes")
    n = len(parent_a)
    if n < 2:
        return parent_a[:], parent_b[:]
    cut = random.randint(1, n-1)
    child1 = parent_a[:cut] + parent_b[cut:]
    child2 = parent_b[:cut] + parent_a[cut:]
    return child1, child2

def tournament_selection(pop, fitnesses, k=GA_TOURNAMENT_K):
    contenders = random.sample(range(len(pop)), k)
    best_idx = max(contenders, key=lambda idx: fitnesses[idx])
    return best_idx

def run_ga_stream(grid, start, goal, pop_size, generations, max_steps, mut_rate, elitism, history, seed):
    if seed is not None:
        random.seed(seed)
    
    def stream_data():
        population = [random_individual(max_steps) for _ in range(pop_size)]
        best_overall = None
        best_overall_fit = float('-inf')

        for gen in range(generations):
            sims = [simulate_path(grid, start, goal, indiv, record_trace=False) for indiv in population]
            fits = [fitness_function(sim, goal, max_steps) for sim in sims]

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

            gen_history_data = {
                "type": "history",
                "generation": gen,
                "fitness": gen_best_fit,
                "positions": gen_best_sim["positions"],
                "best_of_all_time_positions": best_overall["sim"]["positions"],
                "reached": gen_best_sim["reached"],
                "steps_to_goal": gen_best_sim["steps_to_goal"]
            }
            yield f"data: {json.dumps(gen_history_data)}\n\n"

            new_population = []
            elite_indices = sorted(range(pop_size), key=lambda i: fits[i], reverse=True)[:elitism]
            for ei in elite_indices:
                new_population.append(population[ei][:])

            while len(new_population) < pop_size:
                i1 = tournament_selection(population, fits)
                i2 = tournament_selection(population, fits)
                p1, p2 = population[i1], population[i2]
                c1, c2 = crossover(p1, p2)
                new_population.append(mutate(c1, mut_rate))
                if len(new_population) < pop_size:
                    new_population.append(mutate(c2, mut_rate))

            population = new_population

        best_sim = simulate_path(grid, start, goal, best_overall["genes"], record_trace=True)
        best_overall["sim"] = best_sim

        final_data = {
            "type": "final",
            "best_positions": best_overall["sim"]["positions"],
            "best_reached": best_overall["sim"]["reached"],
            "best_steps_to_goal": best_overall["sim"]["steps_to_goal"],
            "best_fitness": fitness_function(best_overall["sim"], goal, max_steps),
            "best_trace": best_overall["sim"]["trace"]
        }
        yield f"data: {json.dumps(final_data)}\n\n"

    return Response(stream_data(), mimetype="text/event-stream")

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
    openness = float(request.args.get('openness', 0.0))
    closeness = float(request.args.get('closeness', 0.0))

    grid, start, goal, R, C = generate_maze(rows, cols, seed, openness, closeness)

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
        "seed": seed,
        "openness": openness,
        "closeness": closeness
    })

@app.route('/api/maze', methods=['GET'])
def api_maze():
    if STATE["maze"] is None:
        grid, start, goal, R, C = generate_maze(DEFAULT_ROWS, DEFAULT_COLS, DEFAULT_SEED)
        STATE.update({"maze": grid, "rows": R, "cols": C, "start": start, "goal": goal})
    return jsonify({
        "rows": STATE["rows"],
        "cols": STATE["cols"],
        "grid": STATE["maze"],
        "start": STATE["start"],
        "goal": STATE["goal"]
    })

@app.route('/api/solve_stream', methods=['POST'])
def api_solve_stream():
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

    GA_TOURNAMENT_K = tournament_k

    return run_ga_stream(
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

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)