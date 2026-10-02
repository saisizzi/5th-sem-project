import { useEffect, useState } from 'react';

import {
  getPopulation,
  getGenerationMetrics,
} from '../api/client';

import type {
  AgentSnapshot,
  GenerationMetric,
} from '../types/domain';

type PopulationResponse = {
  status: string;
  generation?: number;
  population_size?: number;
  starting_capital?: number;
  seed?: number;
  agents: Array<{
    agent_id: string;
    generation: number;
    alive: boolean;
    starting_capital: number;
    current_capital: number;
    trade_count: number;
    parent_a: string | null;
    parent_b: string | null;
    immigrant: boolean;
    elite: boolean;
    genome: Record<string, unknown>;
  }>;
};

export function PopulationPage() {
  const [generationMetrics, setGenerationMetrics] = useState<GenerationMetric[]>([]);
  const [agents, setAgents] = useState<AgentSnapshot[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPopulationData() {
      try {
        setLoading(true);
        setError(null);

        const [generationData, populationData] = await Promise.all([
          getGenerationMetrics(),
          getPopulation(),
        ]);

        const metrics: GenerationMetric[] = generationData.data ?? [];

        const snapshots: AgentSnapshot[] =
          (populationData as PopulationResponse).agents.map((agent) => {
            const returnValue =
              agent.starting_capital > 0
                ? (agent.current_capital - agent.starting_capital) /
                  agent.starting_capital
                : 0;

            return {
              agent_id: agent.agent_id,
              generation: agent.generation,
              status: agent.elite
                ? 'ELITE'
                : agent.alive
                  ? 'ALIVE'
                  : agent.immigrant
                    ? 'IMMIGRANT'
                    : 'DEAD',
              starting_capital: agent.starting_capital,
              ending_capital: agent.current_capital,
              return: returnValue,
              trade_count: agent.trade_count,
              win_rate: 0,
              maximum_drawdown: 0,
              transaction_costs: 0,
              parent_a: agent.parent_a,
              parent_b: agent.parent_b,
              immigrant: agent.immigrant,
              elite: agent.elite,
            };
          });

        setGenerationMetrics(metrics);
        setAgents(snapshots);

        if (metrics.length > 0) {
          setSelectedGeneration(
            metrics[metrics.length - 1].generation,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load population data.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadPopulationData();
  }, []);

  const current =
    generationMetrics.find(
      (generation) =>
        generation.generation === selectedGeneration,
    ) ??
    generationMetrics[generationMetrics.length - 1];

  if (loading) {
    return <p>Loading population data...</p>;
  }

  if (error) {
    return (
      <section>
        <h2>Population</h2>
        <p>{error}</p>
        <p>
          Make sure the FastAPI backend is running on port 8000.
        </p>
      </section>
    );
  }

  return (
    <>
      <section>
        <h2>Population</h2>

        <label htmlFor="generation-select">
          Generation selector
        </label>

        <select
          id="generation-select"
          value={selectedGeneration}
          onChange={(event) =>
            setSelectedGeneration(Number(event.target.value))
          }
        >
          {generationMetrics.map((generation) => (
            <option
              key={generation.generation}
              value={generation.generation}
            >
              Generation {generation.generation}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h3>Generation metrics</h3>

        {current ? (
          <dl className="summary-grid">
            <div>
              <dt>Population size</dt>
              <dd>{current.population_size}</dd>
            </div>

            <div>
              <dt>Alive</dt>
              <dd>{current.alive_count}</dd>
            </div>

            <div>
              <dt>Dead</dt>
              <dd>{current.dead_count}</dd>
            </div>

            <div>
              <dt>Mean capital</dt>
              <dd>{current.mean_capital.toFixed(2)}</dd>
            </div>

            <div>
              <dt>Median capital</dt>
              <dd>{current.median_capital.toFixed(2)}</dd>
            </div>

            <div>
              <dt>Best capital</dt>
              <dd>{current.best_capital.toFixed(2)}</dd>
            </div>

            <div>
              <dt>Worst capital</dt>
              <dd>{current.worst_capital.toFixed(2)}</dd>
            </div>

            <div>
              <dt>Survival rate</dt>
              <dd>
                {(current.survival_rate * 100).toFixed(1)}%
              </dd>
            </div>

            <div>
              <dt>Genetic diversity</dt>
              <dd>
                {current.genetic_diversity.toFixed(3)}
              </dd>
            </div>
          </dl>
        ) : (
          <p>Generation metrics are missing.</p>
        )}
      </section>

      <section>
        <h3>Evolutionary metrics</h3>

        {current ? (
          <dl className="summary-grid">
            <div>
              <dt>Mutation count</dt>
              <dd>{current.mutation_count}</dd>
            </div>

            <div>
              <dt>Immigrant count</dt>
              <dd>{current.immigrant_count}</dd>
            </div>

            <div>
              <dt>Sexual reproduction count</dt>
              <dd>{current.sexual_children}</dd>
            </div>

            <div>
              <dt>Asexual reproduction count</dt>
              <dd>{current.asexual_children}</dd>
            </div>

            <div>
              <dt>Zero-trade count</dt>
              <dd>{current.zero_trade_count}</dd>
            </div>

            <div>
              <dt>Dead count</dt>
              <dd>{current.dead_count}</dd>
            </div>
          </dl>
        ) : (
          <p>Evolutionary metrics are unavailable.</p>
        )}
      </section>

      <section>
        <h3>Agents in selected generation</h3>

        <table>
          <thead>
            <tr>
              <th>Agent ID</th>
              <th>Status</th>
              <th>Ending capital</th>
              <th>Return</th>
            </tr>
          </thead>

          <tbody>
            {agents
              .filter(
                (agent) =>
                  agent.generation === selectedGeneration,
              )
              .map((agent) => (
                <tr key={agent.agent_id}>
                  <td>{agent.agent_id}</td>
                  <td>{agent.status}</td>
                  <td>
                    {agent.ending_capital.toFixed(2)}
                  </td>
                  <td>
                    {(agent.return * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </>
  );
}