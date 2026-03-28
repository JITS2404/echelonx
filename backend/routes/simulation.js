import express from 'express';
import propagationEngine from '../services/propagationEngine.js';

const router = express.Router();

// POST /simulate - Basic shock propagation
router.post('/', (req, res) => {
  try {
    const { shockNode, shockValue } = req.body;
    
    if (!shockNode || shockValue === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: shockNode, shockValue' 
      });
    }
    
    const result = propagationEngine.propagate(shockNode, shockValue);
    
    res.json({
      success: true,
      shock: { node: shockNode, value: shockValue },
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
