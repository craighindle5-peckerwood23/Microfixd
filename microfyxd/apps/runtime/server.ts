import express from 'express';
import { createInitialState } from '@microfyxd/core';
import { buildProductionGraph } from '@microfyxd/agent';

const app = express();
app.use(express.json());

const PORT = 3005; // Scaffolding runs on 3005 in internal monorepo diagram

app.post('/api/run', async (req, res) => {
  const { prompt, sourceCode, hardwareOverride, arcanaTier } = req.body;
  
  try {
    // 1. Initialize State
    let state = createInitialState(prompt);
    
    // 2. Inject Sandbox details if provided
    if (sourceCode) {
      state.sandbox.sourceCode = sourceCode;
    }
    
    // 3. Inject Overrides if provided
    if (hardwareOverride) {
      state.phenotype.hardware = hardwareOverride;
    }
    if (arcanaTier) {
      state.doctrine.currentArcanaTier = arcanaTier;
    }

    // 4. Load the Production compiled LangGraph
    const graph = buildProductionGraph();

    // 5. Run the graph fully
    const finalState = await graph.run(state);

    // 6. Return compliance response with all traces
    res.json({
      success: true,
      finalState,
      traces: finalState.traces,
      output: finalState.messages[finalState.messages.length - 1]?.content
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || String(err)
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MICROFYXD BRAIN] Multi-agent LangGraph Runtime listening on port ${PORT}`);
});
