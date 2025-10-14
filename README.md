# Evident Behaviors

A Bayesian-inspired simulation of how confidence and information evolve through social interactions. The model uses probabilistic updating to track how beliefs change across different interaction types.

## How it works:

- Players keep beliefs over their **own** confidence and information
- Each belief has a **mean (μ ∈ [0,1])** and **precision (τ ≥ 0)**
- Players choose between three actions based on state:
  - **Instigate**: broadcast beliefs to influence the other
  - **Observe**: update information by watching the other
  - **Receive**: update confidence by absorbing from the other
- Updates are **precision-weighted (Kalman-style)** with small noise and time-based decay

*A small experiment in Bayesian social dynamics and multi-agent belief updates.*
