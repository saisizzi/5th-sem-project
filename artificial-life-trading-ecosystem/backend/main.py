from pathlib import Path
import csv
import json
import subprocess
import sys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = PROJECT_ROOT / "results"


app = FastAPI(
    title="Artificial Life Trading Ecosystem API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PopulationExperimentRequest(BaseModel):
    population_size: int = Field(default=10, ge=2, le=100)
    generations: int = Field(default=3, ge=1, le=50)


def load_json(path: Path):
    if not path.exists():
        return None

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def load_generation_metrics():
    path = RESULTS_DIR / "population" / "generation_stats.csv"

    if not path.exists():
        return {
            "status": "not_found",
            "data": [],
        }

    with open(path, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        rows = []

        for row in reader:
            rows.append(
                {
                    "generation": int(row.get("generation", 0)),
                    "population_size": int(
                        row.get("population_size", 0)
                    ),
                    "alive_count": int(
                        row.get("alive_count", 0)
                    ),
                    "dead_count": int(
                        row.get("dead_count", 0)
                    ),
                    "survival_rate": float(
                        row.get("survival_rate", 0)
                    ),
                    "zero_trade_count": int(
                        row.get("zero_trade_count", 0)
                    ),
                    "mean_capital": float(
                        row.get("mean_capital", 0)
                    ),
                    "median_capital": float(
                        row.get("median_capital", 0)
                    ),
                    "best_capital": float(
                        row.get("best_capital", 0)
                    ),
                    "worst_capital": float(
                        row.get("worst_capital", 0)
                    ),
                    "genetic_diversity": float(
                        row.get("genetic_diversity", 0)
                    ),
                    "immigrant_count": int(
                        row.get("immigrant_count", 0)
                    ),
                    "sexual_children": int(
                        row.get("sexual_children", 0)
                    ),
                    "asexual_children": int(
                        row.get("asexual_children", 0)
                    ),
                    "mutation_count": int(
                        row.get("mutation_count", 0)
                    ),
                    "elite_agent_id": row.get(
                        "elite_agent_id",
                        "",
                    ),
                }
            )

    return {
        "status": "ok",
        "data": rows,
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "artificial-life-trading-ecosystem",
    }


@app.get("/api/population")
def get_population():
    path = (
        RESULTS_DIR
        / "population"
        / "population_state.json"
    )

    data = load_json(path)

    if data is None:
        return {
            "status": "not_found",
            "message": (
                "Population results have not been "
                "generated yet."
            ),
        }

    return data


@app.get("/api/population/generations")
def get_generation_metrics():
    return load_generation_metrics()


@app.get("/api/forecasts")
def get_forecasts():
    path = (
        RESULTS_DIR
        / "forecasts"
        / "comparison.json"
    )

    data = load_json(path)

    if data is None:
        return {
            "status": "not_found",
            "message": (
                "Forecast results have not been "
                "generated yet."
            ),
        }

    return data


@app.get("/api/single-agent")
def get_single_agent():
    path = (
        RESULTS_DIR
        / "single_agent_demo"
        / "agent_metrics.json"
    )

    data = load_json(path)

    if data is None:
        return {
            "status": "not_found",
            "message": (
                "Single-agent results have not been "
                "generated yet."
            ),
        }

    return data


@app.get("/api/summary")
def get_summary():
    return {
        "population": load_json(
            RESULTS_DIR
            / "population"
            / "population_state.json"
        ),
        "forecasts": load_json(
            RESULTS_DIR
            / "forecasts"
            / "comparison.json"
        ),
        "single_agent": load_json(
            RESULTS_DIR
            / "single_agent_demo"
            / "agent_metrics.json"
        ),
    }


@app.post("/api/experiments/population")
def run_population_experiment(
    request: PopulationExperimentRequest,
):
    command = [
        sys.executable,
        "experiments/run_population.py",
        "--population-size",
        str(request.population_size),
        "--generations",
        str(request.generations),
    ]

    try:
        result = subprocess.run(
            command,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=900,
        )

    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail=(
                "Population experiment timed out "
                "after 15 minutes."
            ),
        )

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail={
                "message": (
                    "Population experiment failed."
                ),
                "stdout": result.stdout[-5000:],
                "stderr": result.stderr[-5000:],
            },
        )

    population = load_json(
        RESULTS_DIR
        / "population"
        / "population_state.json"
    )

    generation_stats = load_generation_metrics()

    return {
        "status": "completed",
        "parameters": {
            "population_size": request.population_size,
            "generations": request.generations,
        },
        "output": result.stdout,
        "population": population,
        "generation_metrics": generation_stats,
    }