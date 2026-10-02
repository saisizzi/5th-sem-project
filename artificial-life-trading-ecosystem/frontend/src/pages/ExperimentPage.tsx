import { useEffect, useState } from 'react';

type GenerationMetric = {
  generation: number;
  population_size: number;
  alive_count: number;
  dead_count: number;
  survival_rate: number;
  mean_capital: number;
  best_capital: number;
  worst_capital: number;
  genetic_diversity: number;
};

type ExperimentResult = {
  status: string;
  parameters: {
    population_size: number;
    generations: number;
  };
  generation_metrics: {
    status: string;
    data: GenerationMetric[];
  };
};

type JobResponse = {
  status: string;
  job_id?: string;
  parameters?: {
    population_size: number;
    generations: number;
  };
  progress?: {
    completed_generations: number;
    total_generations: number;
  };
  result?: ExperimentResult;
  error?: {
    message?: string;
  };
};

const API_URL = 'http://localhost:8000';

export function ExperimentPage() {
  const [populationSize, setPopulationSize] = useState(10);
  const [generations, setGenerations] = useState(3);

  const [running, setRunning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] =
    useState<ExperimentResult | null>(null);

  async function runExperiment() {
    setRunning(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const response = await fetch(
        `${API_URL}/api/experiments/population`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            population_size: populationSize,
            generations,
          }),
        },
      );

      const data: JobResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message ||
            'Failed to start experiment.',
        );
      }

      if (!data.job_id) {
        throw new Error('Backend did not return a job ID.');
      }

      setJobId(data.job_id);
    } catch (err) {
      setRunning(false);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start experiment.',
      );
    }
  }

  useEffect(() => {
    if (!jobId) {
      return;
    }

    let cancelled = false;

    async function checkStatus() {
      try {
        const response = await fetch(
          `${API_URL}/api/experiments/population/${jobId}`,
        );

        const data: JobResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error?.message ||
              'Failed to check experiment status.',
          );
        }

        if (cancelled) {
          return;
        }

        if (data.progress) {
          const completed =
            data.progress.completed_generations;

          const total =
            data.progress.total_generations;

          setProgress(
            total > 0
              ? Math.min(
                  100,
                  Math.round((completed / total) * 100),
                )
              : 0,
          );
        }

        if (data.status === 'completed') {
          setResult(data.result || null);
          setRunning(false);
          setJobId(null);
          setProgress(100);
          return;
        }

        if (data.status === 'failed') {
          setError(
            data.error?.message ||
              'Experiment failed.',
          );

          setRunning(false);
          setJobId(null);
          return;
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to check experiment status.',
          );

          setRunning(false);
          setJobId(null);
        }
      }
    }

    checkStatus();

    const interval = window.setInterval(
      checkStatus,
      1000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [jobId]);

  const metrics =
    result?.generation_metrics?.data || [];

  const latestGeneration =
    metrics.length > 0
      ? metrics[metrics.length - 1]
      : null;

  return (
    <>
      <section>
        <h2>Run Population Experiment</h2>

        <div className="summary-grid">
          <div>
            <label htmlFor="population-size">
              Population Size
            </label>

            <input
              id="population-size"
              type="number"
              min={2}
              max={100}
              value={populationSize}
              disabled={running}
              onChange={(event) =>
                setPopulationSize(
                  Number(event.target.value),
                )
              }
            />
          </div>

          <div>
            <label htmlFor="generations">
              Generations
            </label>

            <input
              id="generations"
              type="number"
              min={1}
              max={50}
              value={generations}
              disabled={running}
              onChange={(event) =>
                setGenerations(
                  Number(event.target.value),
                )
              }
            />
          </div>
        </div>

        <button
          type="button"
          onClick={runExperiment}
          disabled={running}
        >
          {running
            ? '🧬 Experiment Running...'
            : '🚀 Run Experiment'}
        </button>
      </section>

      {running && (
        <section>
          <h3>🧬 Evolution in Progress</h3>

          <p>
            The trading ecosystem is currently evolving.
          </p>

          <p>
            Population: {populationSize} agents
          </p>

          <p>
            Target generations: {generations}
          </p>

          <p>
            Progress: {progress}%
          </p>

          <div
            style={{
              width: '100%',
              height: '12px',
              background: '#ddd',
              borderRadius: '6px',
              overflow: 'hidden',
              marginTop: '12px',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: '#2563eb',
                transition: 'width 0.5s ease',
              }}
            />
          </div>

          <p>
            You can leave this page open. The experiment
            is running in the backend.
          </p>
        </section>
      )}

      {error && (
        <section>
          <h3>Experiment Error</h3>
          <p>{error}</p>
        </section>
      )}

      {result && (
        <>
          <section>
            <h3>✅ Experiment Completed</h3>

            <dl className="summary-grid">
              <div>
                <dt>Population</dt>
                <dd>
                  {result.parameters.population_size}
                </dd>
              </div>

              <div>
                <dt>Generations</dt>
                <dd>
                  {result.parameters.generations}
                </dd>
              </div>

              <div>
                <dt>Alive</dt>
                <dd>
                  {latestGeneration?.alive_count ?? '—'}
                </dd>
              </div>

              <div>
                <dt>Dead</dt>
                <dd>
                  {latestGeneration?.dead_count ?? '—'}
                </dd>
              </div>

              <div>
                <dt>Survival Rate</dt>
                <dd>
                  {latestGeneration
                    ? `${(
                        latestGeneration.survival_rate *
                        100
                      ).toFixed(1)}%`
                    : '—'}
                </dd>
              </div>

              <div>
                <dt>Mean Capital</dt>
                <dd>
                  {latestGeneration
                    ? latestGeneration.mean_capital.toFixed(2)
                    : '—'}
                </dd>
              </div>

              <div>
                <dt>Best Capital</dt>
                <dd>
                  {latestGeneration
                    ? latestGeneration.best_capital.toFixed(2)
                    : '—'}
                </dd>
              </div>

              <div>
                <dt>Worst Capital</dt>
                <dd>
                  {latestGeneration
                    ? latestGeneration.worst_capital.toFixed(2)
                    : '—'}
                </dd>
              </div>

              <div>
                <dt>Genetic Diversity</dt>
                <dd>
                  {latestGeneration
                    ? latestGeneration.genetic_diversity.toFixed(3)
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h3>Generation Results</h3>

            {metrics.length === 0 ? (
              <p>
                Experiment completed, but no generation
                metrics were returned.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Generation</th>
                    <th>Alive</th>
                    <th>Dead</th>
                    <th>Mean Capital</th>
                    <th>Best Capital</th>
                    <th>Survival</th>
                  </tr>
                </thead>

                <tbody>
                  {metrics.map((generation) => (
                    <tr key={generation.generation}>
                      <td>
                        {generation.generation}
                      </td>

                      <td>
                        {generation.alive_count}
                      </td>

                      <td>
                        {generation.dead_count}
                      </td>

                      <td>
                        {generation.mean_capital.toFixed(2)}
                      </td>

                      <td>
                        {generation.best_capital.toFixed(2)}
                      </td>

                      <td>
                        {(
                          generation.survival_rate * 100
                        ).toFixed(1)}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}