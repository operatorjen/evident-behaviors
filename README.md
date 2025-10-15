# Evident Behaviors

A Bayesian-inspired simulation of how confidence and information evolve through social interactions. The model uses probabilistic updating to track how beliefs change across different interaction types.

## How it works:

- Players keep beliefs over their **own** confidence and information  
- Each belief has a **mean (μ ∈ [0,1])** and **precision (τ ≥ 0)**
- Players choose between three actions based on state:
  - **Instigate**: broadcast beliefs to influence others
  - **Observe**: update information by watching others  
  - **Receive**: update confidence by absorbing from others
- Updates are **precision-weighted (Kalman-style)** with noise and time-based decay
- **Center dynamics** prevent beliefs from stagnating in middle positions
- **Precision management** prevents runaway confidence through damping and capping
- **Behavioral status** emerges from intent calculations (speak/watch) based on belief states

## Key Dynamics:

- **Anti-center bias**: Beliefs naturally repel from moderate positions
- **Confidence scaling**: Information beliefs are scaled based on confidence levels  
- **Status emergence**: Players naturally lean toward observer/instigator/mixed roles
- **Precision stability**: Damping and reset mechanisms maintain healthy uncertainty

*A small experiment in Bayesian social dynamics and multi-agent belief updates.*